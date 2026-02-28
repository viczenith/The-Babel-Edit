import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';
import stripe, { getIsStubClient } from '../config/stripe.js';
import { sendEmail } from '../utils/emailService.js';
import fs from 'fs/promises';
import path from 'path';

// ─── Status transition map ──────────────────────────────────────────────────
// Defines which status transitions are allowed.
const ALLOWED_TRANSITIONS = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// Create order from cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check email verification
    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
    if (!caller?.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before placing an order.' });
    }

    const { 
      shippingAddressId, 
      paymentMethod, 
      notes,
      promoCode 
    } = req.body;

    // Get user's cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate shipping address
    const shippingAddress = await prisma.address.findFirst({
      where: { 
        id: shippingAddressId,
        userId 
      }
    });

    if (!shippingAddress) {
      return res.status(400).json({ message: 'Invalid shipping address' });
    }

    // Check stock availability for all items (preliminary check — authoritative check inside transaction below)
    const stockIssues = [];
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        stockIssues.push({
          productName: item.product.name,
          requested: item.quantity,
          available: item.product.stock
        });
      }
    }

    if (stockIssues.length > 0) {
      const errorMessage = stockIssues.map(issue =>
        `${issue.productName}: requested ${issue.requested}, only ${issue.available} available`
      ).join('; ');

      return res.status(400).json({
        message: `Insufficient stock. ${errorMessage}`,
        stockIssues
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );

    const tax = subtotal * 0.08; // 8% tax rate
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    let discount = 0;

    // Apply promo code if provided
    if (promoCode) {
      // Simple promo code logic - you can expand this
      if (promoCode === 'SAVE10') {
        discount = subtotal * 0.10;
      } else if (promoCode === 'FREESHIP') {
        discount = shipping;
      }
    }

    const total = subtotal + tax + shipping - discount;

    // Create order in transaction (with authoritative stock check inside)
    const result = await prisma.$transaction(async (prisma) => {
      // Re-check stock inside transaction to prevent race conditions (concurrent orders)
      for (const item of cart.items) {
        const freshProduct = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true }
        });
        if (!freshProduct || freshProduct.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${freshProduct?.name || item.productId}: only ${freshProduct?.stock ?? 0} available, requested ${item.quantity}`);
        }
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          shippingAddressId,
          notes
        }
      });

      // Create order items and update product stock
      for (const item of cart.items) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            size: item.size,
            color: item.color,
            productName: item.product.name,
            productImage: item.product.imageUrl || null
          }
        });

        // Reduce product stock
        await prisma.product.update({
          where: { id: item.productId },
          data: { 
            stock: { 
              decrement: item.quantity 
            } 
          }
        });
      }

      // Clear cart
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return order;
    }, { timeout: 30000 });

      // Fetch the full order details to return
      const newOrder = await prisma.order.findUnique({
        where: { id: result.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      // Audit: order created from cart
      await appendAuditLog({
        action: 'create_order',
        resource: 'Order',
        resourceId: newOrder.id,
        details: { orderId: newOrder.id, total: newOrder.total, itemCount: newOrder.items.length },
        user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
        req,
      });

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          status: newOrder.status,
          paymentStatus: newOrder.paymentStatus,
          total: newOrder.total,
          itemCount: newOrder.items.length,
          createdAt: newOrder.createdAt,
          items: newOrder.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            color: item.color,
            product: {
              id: item.productId,
              name: item.productName || item.product?.name || 'Unknown',
              imageUrl: item.productImage || item.product?.imageUrl || null,
            }
          })),
        },
      });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};


// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.order.count({ where });

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          product: {
            id: item.productId,
            name: item.productName || item.product?.name || 'Unknown',
            imageUrl: item.productImage || item.product?.imageUrl || null,
          }
        }))
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Get specific order
export const getOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId 
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                description: true
              }
            }
          }
        },
        shippingAddress: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      cancelledAt: order.cancelledAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      shippingAddress: order.shippingAddress,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        product: {
          id: item.productId,
          name: item.productName || item.product?.name || 'Unknown',
          description: item.product?.description,
          imageUrl: item.productImage || item.product?.imageUrl || null,
        },
        subtotal: item.price * item.quantity
      }))
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

// Cancel order (only if pending)
export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        userId 
      },
      include: {
        items: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    await prisma.$transaction(async (prisma) => {
      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'REFUNDED',
          cancelledAt: new Date()
        }
      });

      // Restore product stock
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { 
            stock: { 
              increment: item.quantity 
            } 
          }
        });
      }
    }, { timeout: 30000 });

    // Audit: order cancelled
    await appendAuditLog({
      action: 'cancel_order',
      resource: 'Order',
      resourceId: orderId,
      details: { orderId, restoredItems: order.items.length },
      previousValues: { status: order.status, paymentStatus: order.paymentStatus },
      severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
  try {
    // SQLite doesn't support case-insensitive mode, only PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://');
    const strContains = (val) => isPostgreSQL ? { contains: val, mode: 'insensitive' } : { contains: val };

    const { page = 1, limit = 20, status, search } = req.query;

    let where = {};
    if (status) {
      where.status = status.toUpperCase();
    }
    if (search) {
      where.OR = [
        { orderNumber: strContains(search) },
        { user: { email: strContains(search) } }
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.order.count({ where });

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        user: order.user,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        cancelledAt: order.cancelledAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        notes: order.notes,
        shippingAddress: order.shippingAddress,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId || item.product?.id || null,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          product: {
            id: item.product?.id || item.productId || null,
            name: item.productName || item.product?.name || 'Unknown',
            imageUrl: item.productImage || item.product?.imageUrl || null,
          }
        }))
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Admin: Get single order detail (no userId filter)
export const getAdminOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                description: true
              }
            }
          }
        },
        shippingAddress: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      cancelledAt: order.cancelledAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      user: order.user,
      shippingAddress: order.shippingAddress,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        product: {
          id: item.product?.id || item.productId,
          name: item.productName || item.product?.name || 'Unknown',
          description: item.product?.description,
          imageUrl: item.productImage || item.product?.imageUrl || null,
        },
        subtotal: item.price * item.quantity
      }))
    });
  } catch (error) {
    console.error('Admin get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDelivery } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Fetch current order with items for stock restore and refund
    const oldOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    if (!oldOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // ── Determine if this is a status change or tracking-only update ──
    const isStatusChange = status !== oldOrder.status;

    // ── Status transition validation (only when status is actually changing) ──
    if (isStatusChange) {
      const allowed = ALLOWED_TRANSITIONS[oldOrder.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot transition from ${oldOrder.status} to ${status}. Allowed transitions: ${(allowed || []).join(', ') || 'none'}`
        });
      }
    }

    // Build update data
    const updateData = {};
    if (isStatusChange) updateData.status = status;
    
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);

    // Set lifecycle timestamps based on new status (only on actual status change)
    if (isStatusChange) {
      if (status === 'SHIPPED') {
        updateData.paymentStatus = 'PAID';
        updateData.shippedAt = new Date();
      }
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }
      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
      }
    }

    // ── Handle CANCELLED / REFUNDED: restore stock + Stripe refund ──
    if (isStatusChange && (status === 'CANCELLED' || status === 'REFUNDED')) {
      // Set payment status
      updateData.paymentStatus = oldOrder.paymentStatus === 'PAID' ? 'REFUNDED' : oldOrder.paymentStatus;
      if (status === 'REFUNDED') {
        updateData.paymentStatus = 'REFUNDED';
      }

      // Use transaction to atomically update order + restore stock
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: updateData });

        // Restore stock for all items
        for (const item of oldOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }, { timeout: 30000 });

      // ── Stripe refund (if paid via Stripe and has paymentIntentId) ──
      if (status === 'REFUNDED' && oldOrder.paymentIntentId && oldOrder.paymentStatus === 'PAID') {
        try {
          if (!getIsStubClient()) {
            await stripe.refunds.create({
              payment_intent: oldOrder.paymentIntentId,
            });
          } else {
          }
        } catch (refundError) {
          // Don't fail the status update - log it for manual resolution
          await appendAuditLog({
            action: 'stripe_refund_failed',
            resource: 'Payment',
            resourceId: orderId,
            details: { orderId, paymentIntentId: oldOrder.paymentIntentId, error: refundError.message },
            severity: 'critical',
            user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
            req,
          });
        }
      }
    } else {
      // Normal status update or tracking-only update (no stock changes)
      await prisma.order.update({
        where: { id: orderId },
        data: updateData
      });
    }

    // Re-fetch the updated order for the response
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, status: true, trackingNumber: true, paymentStatus: true }
    });

    // Audit: order status updated
    await appendAuditLog({
      action: 'update_order_status',
      resource: 'Order',
      resourceId: orderId,
      details: {
        orderId,
        newStatus: status,
        trackingNumber: updatedOrder.trackingNumber,
        stockRestored: status === 'CANCELLED' || status === 'REFUNDED',
        itemsRestored: (status === 'CANCELLED' || status === 'REFUNDED') ? oldOrder.items.length : 0
      },
      previousValues: { status: oldOrder.status, paymentStatus: oldOrder.paymentStatus, trackingNumber: oldOrder.trackingNumber },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    // ── Send email to customer ──
    try {
      if (isStatusChange) {
        // Status changed — send status change email
        await sendStatusChangeEmail(oldOrder, status, trackingNumber, estimatedDelivery);
      } else if (trackingNumber && trackingNumber !== oldOrder.trackingNumber) {
        // Tracking-only update — send tracking update email
        await sendTrackingUpdateEmail(oldOrder, trackingNumber);
      }
    } catch (emailError) {
      // Don't fail the response for email errors
      console.error('[EMAIL] Failed to send order update email:', emailError.message);
    }

    res.json({ 
      message: 'Order status updated successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        trackingNumber: updatedOrder.trackingNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// ─── Send status change email ──────────────────────────────────────────────
const sendStatusChangeEmail = async (order, newStatus, trackingNumber, estimatedDelivery) => {
  if (!order.user?.email) return;

  const customerName = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email;
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const orderDetailsUrl = `${frontendUrl}/en/orders/${order.id}`;
  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

  let subject = '';
  let statusMessage = '';
  let statusColor = '#333333';
  let reviewSection = '';

  switch (newStatus) {
    case 'CONFIRMED':
      subject = `Your Order #${order.orderNumber} Has Been Confirmed`;
      statusMessage = 'Your order has been confirmed and is being prepared for processing.';
      statusColor = '#0d9488'; // teal
      break;
    case 'PROCESSING':
      subject = `Your Order #${order.orderNumber} Is Being Processed`;
      statusMessage = 'Your order is now being processed and will be shipped soon.';
      statusColor = '#7c3aed'; // purple
      break;
    case 'SHIPPED':
      subject = `Your Order #${order.orderNumber} Has Been Shipped!`;
      statusMessage = trackingNumber
        ? `Your order is on its way! Your tracking number is: <strong>${trackingNumber}</strong>`
        : 'Your order is on its way! You will receive tracking information shortly.';
      if (estimatedDelivery) {
        statusMessage += `<br><br>Estimated delivery: <strong>${new Date(estimatedDelivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>`;
      }
      statusColor = '#2563eb'; // blue
      break;
    case 'DELIVERED':
      subject = `Your Order #${order.orderNumber} Has Been Delivered`;
      statusMessage = 'Your order has been delivered! We hope you enjoy your purchase. If you have any issues, please don\'t hesitate to contact us.';
      statusColor = '#16a34a'; // green
      reviewSection = `
        <div style="margin: 28px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7, #fefce8); border-radius: 12px; text-align: center; border: 1px solid #fde68a;">
          <p style="font-size: 16px; font-weight: 700; color: #92400e; margin: 0 0 8px;">How was your experience? ⭐</p>
          <p style="font-size: 14px; color: #78350f; margin: 0 0 16px;">Your feedback helps other shoppers and helps us improve.</p>
          <a href="${frontendUrl}/en/orders" style="display: inline-block; padding: 12px 28px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">Leave a Review</a>
        </div>
      `;
      break;
    case 'CANCELLED':
      subject = `Your Order #${order.orderNumber} Has Been Cancelled`;
      statusMessage = 'Your order has been cancelled. If you were charged, a refund will be processed shortly.';
      statusColor = '#dc2626'; // red
      break;
    case 'REFUNDED':
      subject = `Your Order #${order.orderNumber} Has Been Refunded`;
      statusMessage = `Your order has been refunded. The amount of <strong>${formatCurrency(order.total)}</strong> will be returned to your original payment method within 5-10 business days.`;
      statusColor = '#ea580c'; // orange
      break;
    default:
      return; // Don't send email for unknown statuses
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f8f8;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #000000; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">The Babel Edit</h1>
        </div>
        <div style="padding: 32px; color: #333333;">
          <h2 style="font-size: 20px; color: #000000;">Hi ${customerName},</h2>
          <div style="margin: 24px 0; padding: 16px; border-left: 4px solid ${statusColor}; background-color: #f9fafb; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Order Status</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: ${statusColor};">${newStatus}</p>
          </div>
          <p style="line-height: 1.6; margin: 16px 0;">${statusMessage}</p>
          <p style="line-height: 1.6; margin: 16px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="line-height: 1.6; margin: 16px 0;"><strong>Order Total:</strong> ${formatCurrency(order.total)}</p>
          <p style="margin-top: 24px;">You can view your full order details below:</p>
          <a href="${orderDetailsUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; margin-top: 12px;">View Your Order</a>
          ${reviewSection}
        </div>
        <div style="background-color: #f2f2f2; padding: 24px; text-align: center; font-size: 12px; color: #888888;">
          <p>&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: order.user.email,
    subject,
    html
  });
};

// ─── Send tracking update email (tracking-only, no status change) ──────────
const sendTrackingUpdateEmail = async (order, trackingNumber) => {
  if (!order.user?.email) return;

  const customerName = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email;
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const orderDetailsUrl = `${frontendUrl}/en/orders/${order.id}`;
  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tracking Number Updated</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f8f8;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #000000; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">The Babel Edit</h1>
        </div>
        <div style="padding: 32px; color: #333333;">
          <h2 style="font-size: 20px; color: #000000;">Hi ${customerName},</h2>
          <p style="line-height: 1.6; margin: 16px 0;">Your tracking information has been updated for order <strong>#${order.orderNumber}</strong>.</p>
          <div style="margin: 24px 0; padding: 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Tracking Number</p>
            <p style="margin: 0; font-size: 22px; font-weight: bold; color: #1d4ed8; font-family: monospace;">${trackingNumber}</p>
          </div>
          <p style="line-height: 1.6; margin: 16px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="line-height: 1.6; margin: 16px 0;"><strong>Order Total:</strong> ${formatCurrency(order.total)}</p>
          <p style="margin-top: 24px;">You can track your order and view full details below:</p>
          <a href="${orderDetailsUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; margin-top: 12px;">View Your Order</a>
        </div>
        <div style="background-color: #f2f2f2; padding: 24px; text-align: center; font-size: 12px; color: #888888;">
          <p>&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: order.user.email,
    subject: `Tracking Update for Order #${order.orderNumber}`,
    html
  });
};

// Add this new function to your existing orderController.js
// This is specifically for the Stripe checkout flow

// Create order directly from checkout (for Stripe payment flow)
export const createOrderFromCheckout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check email verification
    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
    if (!caller?.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before placing an order.' });
    }

    const { items, shippingCost, totalAmount, shippingMethod, shippingDetails } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    // Validate all products exist and have sufficient stock
    const stockIssues = [];
    const productData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.productId}`
        });
      }

      productData.push({ item, product });

      if (product.stock < item.quantity) {
        stockIssues.push({
          productName: product.name,
          requested: item.quantity,
          available: product.stock
        });
      }
    }

    if (stockIssues.length > 0) {
      const errorMessage = stockIssues.map(issue =>
        `${issue.productName}: requested ${issue.requested}, only ${issue.available} available`
      ).join('; ');

      return res.status(400).json({
        message: `Insufficient stock. ${errorMessage}`,
        stockIssues
      });
    }

    // Calculate subtotal from items using SERVER-SIDE product prices (not client-sent prices)
    const subtotal = productData.reduce((sum, { item, product }) => 
      sum + (product.price * item.quantity), 0
    );

    const tax = subtotal * 0.08; // 8% tax
    const shipping = parseFloat(shippingCost || 0);
    const discount = 0; // No discount for now
    const serverTotal = subtotal + tax + shipping - discount;

    // Validate that client total matches server calculation (allow small rounding tolerance)
    const clientTotal = parseFloat(totalAmount);
    if (Math.abs(serverTotal - clientTotal) > 1) {
      console.warn(`⚠️ Total mismatch: client=${clientTotal}, server=${serverTotal}`);
      // Use server-calculated total for security
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create order with items in a transaction (extended timeout for slow DB connections)
    const order = await prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction to prevent race conditions (concurrent orders)
      for (const { item, product } of productData) {
        const freshProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true }
        });
        if (!freshProduct || freshProduct.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${freshProduct?.name || item.productId}: only ${freshProduct?.stock ?? 0} available, requested ${item.quantity}`);
        }
      }

      // Create shipping address from checkout form details if provided
      let shippingAddressId = null;
      if (shippingDetails && shippingDetails.address) {
        const address = await tx.address.create({
          data: {
            userId,
            firstName: shippingDetails.firstName || '',
            lastName: shippingDetails.lastName || '',
            address1: shippingDetails.address || '',
            city: shippingDetails.city || '',
            state: shippingDetails.state || '',
            postalCode: shippingDetails.zipCode || '',
            country: 'US',
            phone: shippingDetails.phone || null,
          }
        });
        shippingAddressId = address.id;
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'STRIPE',
          subtotal,
          tax,
          shipping,
          discount,
          total: serverTotal, // Use server-calculated total, not client-sent
          notes: shippingMethod ? `Shipping: ${shippingMethod}` : null,
          ...(shippingAddressId ? { shippingAddressId } : {}),
        }
      });

      for (const { item, product } of productData) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: parseInt(item.quantity),
            price: product.price, // Use server-side price, not client-sent
            size: item.size || null,
            color: item.color || null,
            productName: product.name,
            productImage: product.imageUrl || null
          }
        });

        // Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: parseInt(item.quantity)
            }
          }
        });
      }
      return newOrder;
    }, { timeout: 30000 });

    // Fetch the complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        shippingAddress: true
      }
    });

    // Audit: order created from checkout (Stripe)
    await appendAuditLog({
      action: 'create_order_from_checkout',
      resource: 'Order',
      resourceId: completeOrder.id,
      details: { orderId: completeOrder.id, total: completeOrder.total, itemCount: completeOrder.items.length },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(201).json({
      id: completeOrder.id,
      orderNumber: completeOrder.orderNumber,
      total: completeOrder.total,
      status: completeOrder.status,
      userId: completeOrder.userId,
      items: completeOrder.items
    });
  } catch (error) {
    console.error('Create order from checkout error:', error);
    // Return stock error message to user if it's a stock issue
    if (error.message && error.message.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ 
      message: 'Failed to create order'
    });
  }
};

// Confirm order payment
export const confirmOrderPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If payment is already confirmed, just return success without updating
    if (order.paymentStatus === 'PAID') {
      const currentOrder = await prisma.order.findUnique({ where: { id: orderId }});
      return res.json({ message: 'Payment already confirmed', order: currentOrder });
    }

    // Only allow update if the order is in PENDING state
    if (order.status !== 'PENDING') {
      return res.status(400).json({ message: 'This order status cannot be updated.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    // Audit log: payment confirmed for order
    await appendAuditLog({
      action: 'confirm_order_payment',
      resource: 'Order',
      resourceId: updatedOrder.id,
      details: { orderId: updatedOrder.id, paymentStatus: updatedOrder.paymentStatus, status: updatedOrder.status },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    // Send confirmation emails (non-blocking)
    try {
      const { sendConfirmationEmails } = await import('./paymentController.js');
      await sendConfirmationEmails(updatedOrder);
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send order confirmation emails:', emailErr.message);
    }

    res.json({ message: 'Payment confirmed successfully', order: updatedOrder });
  } catch (error) {
    console.error('Confirm order payment error:', error);
    res.status(500).json({ message: 'Failed to confirm order payment' });
  }
};