import stripe, { getIsStubClient } from '../config/stripe.js';
import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';
import { appendAuditLog } from './adminController.js';
import fs from 'fs/promises';
import path from 'path';

export const createPaymentIntent = async (req, res) => {
  try {

    const userId = req.user?.userId;
    const { orderId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Fetch order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found or does not belong to user'
      });
    }

    // Validate amount
    if (!order.total || order.total <= 0) {
      return res.status(400).json({ message: 'Invalid order amount' });
    }

    // Check if already paid
    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    // Create payment intent
    const amountInCents = Math.round(order.total * 100);
    const MIN_AMOUNT = 50; // For USD, the minimum is $0.50

    if (isNaN(amountInCents) || amountInCents < MIN_AMOUNT) {
      return res.status(400).json({ message: `Invalid calculated amount for payment: $${(amountInCents/100).toFixed(2)}. Must be at least $0.50.` });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: userId
      },
      description: `Order ${order.orderNumber}`,
      // Enable all supported payment methods: Card (Visa, Mastercard, Amex), Apple Pay, Google Pay, etc.
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      return res.status(500).json({
        message: 'Payment gateway returned an incomplete response. Please check your Stripe API keys.',
      });
    }

    // Link payment intent to order
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: paymentIntent.id },
    });

    // Audit: payment intent created
    await appendAuditLog({
      action: 'create_payment_intent',
      resource: 'Payment',
      resourceId: paymentIntent.id,
      details: { orderId: order.id, orderNumber: order.orderNumber, amount: order.total, amountInCents, paymentIntentId: paymentIntent.id },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        message: 'Invalid payment request. Please try again.',
      });
    }

    if (error.type === 'StripeAuthenticationError') {
      return res.status(500).json({
        message: 'Payment service configuration error. Please contact support.',
      });
    }

    // Return safe error message — details stay in server logs
    res.status(500).json({
      message: 'Error creating payment intent. Please try again.',
      ...(process.env.NODE_ENV === 'development' && {
        error: {
          message: error.message,
          type: error.type,
          code: error.code,
        }
      })
    });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handleFailedPayment(failedPayment);
        break;
      
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: 'Webhook handling error' });
  }
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const { orderId } = paymentIntent.metadata;

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentMethod: 'STRIPE'
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
    // Audit: successful payment via webhook
    await appendAuditLog({
      action: 'payment_succeeded',
      resource: 'Payment',
      resourceId: orderId,
      details: { orderId, paymentIntentId: paymentIntent.id, amount: paymentIntent.amount / 100, orderNumber: updatedOrder.orderNumber },
      previousValues: { status: 'PENDING', paymentStatus: 'PENDING' },
      severity: 'info',
      user: { id: updatedOrder.user?.id || 'system', email: updatedOrder.user?.email || 'stripe-webhook', role: 'SYSTEM' },
    });

    // Send confirmation emails
    await sendConfirmationEmails(updatedOrder);

  } catch (error) {
    // Even if emails fail, the payment was successful. Don't throw error back to Stripe.
  }
};

const sendConfirmationEmails = async (order) => {
  try {
    const customerTemplatePath = path.resolve(process.cwd(), 'templates', 'customerConfirmation.html');
    const companyTemplatePath = path.resolve(process.cwd(), 'templates', 'companyNotification.html');

    const [customerHtml, companyHtml] = await Promise.all([
      fs.readFile(customerTemplatePath, 'utf-8'),
      fs.readFile(companyTemplatePath, 'utf-8')
    ]);
    
    // --- Common data ---
    const formatCurrency = (amount) => `$${amount.toFixed(2)}`;
    const customerName = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email;
    const orderDetailsUrl = `${process.env.FRONTEND_URL}/orders/${order.id}`;
    const adminOrderUrl = `${process.env.FRONTEND_URL}/admin/orders/${order.id}`;

    // --- Customer Email ---
    const customerOrderItems = order.items.map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    let finalCustomerHtml = customerHtml
      .replace('{{customerName}}', customerName)
      .replace('{{orderNumber}}', order.orderNumber)
      .replace('{{orderItems}}', customerOrderItems)
      .replace('{{subtotal}}', formatCurrency(order.subtotal))
      .replace('{{shipping}}', formatCurrency(order.shipping))
      .replace('{{tax}}', formatCurrency(order.tax))
      .replace('{{total}}', formatCurrency(order.total))
      .replace('{{orderDetailsUrl}}', orderDetailsUrl);

    await sendEmail({
      to: order.user.email,
      subject: `Your The Babel Edit Order Confirmation (#${order.orderNumber})`,
      html: finalCustomerHtml
    });
    // --- Company Email ---
    const companyOrderItems = order.items.map(item => `
      <tr>
        <td>${item.product.sku || 'N/A'}</td>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.price)}</td>
      </tr>
    `).join('');
    
    const shippingAddressHtml = order.shippingAddress
      ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
         ${order.shippingAddress.address1}<br>
         ${order.shippingAddress.address2 || ''}<br>
         ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
         ${order.shippingAddress.country}`
      : 'N/A';

    let finalCompanyHtml = companyHtml
      .replace('{{orderNumber}}', order.orderNumber)
      .replace('{{customerName}}', customerName)
      .replace('{{customerEmail}}', order.user.email)
      .replace('{{total}}', formatCurrency(order.total))
      .replace('{{orderItems}}', companyOrderItems)
      .replace('{{shippingAddress}}', shippingAddressHtml)
      .replace('{{adminOrderUrl}}', adminOrderUrl);

    await sendEmail({
      to: process.env.COMPANY_EMAIL || 'support@thebabeledit.com',
      subject: `New Order Received: #${order.orderNumber}`,
      html: finalCompanyHtml
    });
  } catch (error) {
    // Email send failure — don't let it crash the webhook response
  }
};

const handleFailedPayment = async (paymentIntent) => {
  const { orderId } = paymentIntent.metadata;
  
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PENDING',
        paymentStatus: 'FAILED'
      }
    });
    // Audit: failed payment via webhook
    await appendAuditLog({
      action: 'payment_failed',
      resource: 'Payment',
      resourceId: orderId,
      details: { orderId, paymentIntentId: paymentIntent.id, failureMessage: paymentIntent.last_payment_error?.message || null },
      severity: 'warning',
      user: { id: 'system', email: 'stripe-webhook', role: 'SYSTEM' },
    });
  } catch (error) {
    throw error;
  }
};