import prisma from '../prismaClient.js';

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                stock: true
              }
            }
          }
        }
      }
    });

    if (!cart) {
      return res.json({ items: [], itemCount: 0, total: 0 });
    }

    // Filter out items whose product was hard-deleted (product will be null)
    const validItems = cart.items.filter(item => item.product != null);

    // Calculate total (include all items — stock warnings are handled in the UI)
    const total = validItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.json({
      items: validItems.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        stock: item.product.stock,
        subtotal: item.product.price * item.quantity
      })),
      itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
      total
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

// Add item to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1, size, color } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Normalize empty strings to null for size/color
    const normalizedSize = size && String(size).trim() ? String(size).trim() : null;
    const normalizedColor = color && String(color).trim() ? String(color).trim() : null;

    // Validate product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Find or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        size: normalizedSize,
        color: normalizedColor
      }
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          size: normalizedSize,
          color: normalizedColor
        }
      });
    }

    res.json({ message: 'Item added to cart successfully' });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      return res.status(400).json({ message: 'Quantity must be a number of at least 1' });
    }

    // Verify item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Check stock
    if (quantity > cartItem.product.stock) {
      return res.status(400).json({
        message: `Insufficient stock. Only ${cartItem.product.stock} available`,
        available: cartItem.product.stock,
        requested: quantity
      });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    res.json({ message: 'Cart item updated successfully' });

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    // Verify item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    res.json({ message: 'Item removed from cart successfully' });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.cartItem.deleteMany({
      where: {
        cart: { userId }
      }
    });

    res.json({ message: 'Cart cleared successfully' });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};