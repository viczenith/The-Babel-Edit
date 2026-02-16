import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// Get user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            comparePrice: true,
            imageUrl: true,
            images: true,
            stock: true,
            sizes: true,
            colors: true,
            isActive: true,
            collection: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.wishlistItem.count({
      where: { userId }
    });

    res.json({
      items: wishlistItems.map(item => ({
        id: item.id,
        productId: item.productId,
        addedAt: item.createdAt,
        product: {
          ...item.product,
          isInStock: item.product.stock > 0,
          discountPercentage: item.product.comparePrice 
            ? Math.round(((item.product.comparePrice - item.product.price) / item.product.comparePrice) * 100)
            : null
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

// Add product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    // Validate product exists and is active
    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or inactive' });
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingItem) {
      return res.status(409).json({ message: 'Product already in wishlist' });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId,
        productId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true
          }
        }
      }
    });

    await appendAuditLog({
      action: 'add_to_wishlist', resource: 'Wishlist', resourceId: wishlistItem.id,
      details: { productId, userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.status(201).json({
      message: 'Product added to wishlist',
      item: {
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        product: wishlistItem.product,
        addedAt: wishlistItem.createdAt
      }
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Failed to add product to wishlist' });
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        productId
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    await appendAuditLog({
      action: 'remove_from_wishlist', resource: 'Wishlist',
      details: { productId, userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ message: 'Product removed from wishlist' });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Failed to remove product from wishlist' });
  }
};

// Check if product is in wishlist
export const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        productId
      }
    });

    res.json({ 
      inWishlist: !!wishlistItem,
      wishlistItemId: wishlistItem?.id || null
    });

  } catch (error) {
    console.error('Check wishlist status error:', error);
    res.status(500).json({ message: 'Failed to check wishlist status' });
  }
};

// Clear entire wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.wishlistItem.deleteMany({
      where: { userId }
    });

    await appendAuditLog({
      action: 'clear_wishlist', resource: 'Wishlist',
      details: { userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ message: 'Wishlist cleared successfully' });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Failed to clear wishlist' });
  }
};

// Move wishlist item to cart
export const moveToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity = 1, size, color } = req.body;

    // Check if product is in wishlist
    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        productId
      },
      include: {
        product: true
      }
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    // Check stock
    if (wishlistItem.product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if item already exists in cart with same variants
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        size,
        color
      }
    });

    await prisma.$transaction(async (prisma) => {
      if (existingCartItem) {
        // Update quantity in cart
        await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + quantity }
        });
      } else {
        // Create new cart item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            size,
            color
          }
        });
      }

      // Remove from wishlist
      await prisma.wishlistItem.delete({
        where: {
          userId_productId: {
            userId,
            productId
          }
        }
      });
    });

    await appendAuditLog({
      action: 'move_wishlist_to_cart', resource: 'Wishlist',
      details: { productId, userId, quantity },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ 
      message: 'Product moved from wishlist to cart successfully' 
    });

  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({ message: 'Failed to move product to cart' });
  }
};
