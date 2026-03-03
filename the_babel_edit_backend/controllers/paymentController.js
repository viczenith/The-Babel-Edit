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

export const sendConfirmationEmails = async (order) => {
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
    const orderDetailsUrl = `${process.env.FRONTEND_URL}/en/orders/${order.id}`;
    const adminOrderUrl = `${process.env.FRONTEND_URL}/en/admin/orders/${order.id}`;

    // --- Customer Email ---
    const customerOrderItems = order.items.map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    let finalCustomerHtml = customerHtml
      .replaceAll('{{customerName}}', customerName)
      .replaceAll('{{orderNumber}}', order.orderNumber)
      .replaceAll('{{orderItems}}', customerOrderItems)
      .replaceAll('{{subtotal}}', formatCurrency(order.subtotal))
      .replaceAll('{{shipping}}', formatCurrency(order.shipping))
      .replaceAll('{{tax}}', formatCurrency(order.tax))
      .replaceAll('{{total}}', formatCurrency(order.total))
      .replaceAll('{{orderDetailsUrl}}', orderDetailsUrl)
      .replaceAll('{{year}}', new Date().getFullYear().toString());

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
      .replaceAll('{{orderNumber}}', order.orderNumber)
      .replaceAll('{{customerName}}', customerName)
      .replaceAll('{{customerEmail}}', order.user.email)
      .replaceAll('{{total}}', formatCurrency(order.total))
      .replaceAll('{{orderItems}}', companyOrderItems)
      .replaceAll('{{shippingAddress}}', shippingAddressHtml)
      .replaceAll('{{adminOrderUrl}}', adminOrderUrl);

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
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PENDING',
        paymentStatus: 'FAILED'
      },
      include: {
        user: { select: { email: true, firstName: true } },
        items: { include: { product: { select: { name: true } } } }
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

    // Send payment failed email to customer
    if (order.user?.email) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const failureReason = paymentIntent.last_payment_error?.message || 'Your payment could not be processed.';
      const itemsList = order.items.map(item => `<li style="color: #374151; margin-bottom: 4px;">${item.product?.name || 'Item'} × ${item.quantity}</li>`).join('');

      const failedHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3e8e7;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px;">
              <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
                <!-- Header -->
                <div style="border-top: 4px solid #ef4444; padding: 36px 32px; text-align: center;">
                  <p style="color: #7f1d1d; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">Payment Notice</p>
                  <h1 style="color: #0f172a; font-size: 26px; font-weight: 600; margin: 0; letter-spacing: -0.025em; font-family: 'Playfair Display', Georgia, serif;">The Babel Edit</h1>
                  <div style="width: 40px; height: 2px; background: #ef4444; margin: 14px auto 0;"></div>
                </div>

                <div style="padding: 40px 32px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; line-height: 56px; font-size: 24px;">⚠️</div>
                  </div>

                  <h2 style="font-size: 22px; font-weight: 600; color: #0f172a; margin: 0 0 20px; text-align: center; font-family: 'Playfair Display', Georgia, serif;">Payment Unsuccessful</h2>
                  
                  <p style="color: #374151; font-size: 15px; margin: 0 0 12px;">Hi ${order.user.firstName || 'there'},</p>
                  <p style="color: #64748b; font-size: 15px; margin: 0 0 20px;">We were unable to process payment for your order <strong style="color: #0f172a;">#${orderId.slice(-8).toUpperCase()}</strong>.</p>
                  
                  <div style="background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 0 8px 8px 0; padding: 14px 20px; margin: 0 0 24px;">
                    <p style="color: #dc2626; font-size: 13px; margin: 0;"><strong>Reason:</strong> ${failureReason}</p>
                  </div>
                  
                  <p style="color: #7f1d1d; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px; font-weight: 600;">Order Items</p>
                  <ul style="padding-left: 20px; margin: 0 0 24px;">${itemsList}</ul>
                  
                  <p style="color: #64748b; font-size: 15px; margin: 0 0 24px;">Please try again with a different payment method or contact your bank for details.</p>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${frontendUrl}/en/cart" style="display: inline-block; padding: 14px 44px; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; border-radius: 9999px;">Retry Payment</a>
                  </div>
                  
                  <p style="color: #64748b; font-size: 13px; margin: 0;">Need help? Contact us at <a href="mailto:${process.env.COMPANY_EMAIL || 'support@thebabeledit.com'}" style="color: #ef4444; text-decoration: none;">${process.env.COMPANY_EMAIL || 'support@thebabeledit.com'}</a></p>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid #e8d9d9; padding: 28px 32px; text-align: center;">
                  <p style="color: #7f1d1d; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px;">The Babel Edit</p>
                  <div style="width: 30px; height: 1px; background: #e8d9d9; margin: 0 auto 12px;"></div>
                  <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      sendEmail({
        to: order.user.email,
        subject: 'Payment Failed — The Babel Edit',
        html: failedHtml
      }).catch((err) => {
        console.error(`❌ Payment failed email error for ${order.user.email}:`, err.message || err);
      });
    }
  } catch (error) {
    throw error;
  }
};