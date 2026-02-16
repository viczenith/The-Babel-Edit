import express from 'express';
import { createPaymentIntent, handleWebhook } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create payment intent (requires authentication)
router.post('/create-payment-intent', authenticateToken, createPaymentIntent);

// Stripe webhook (no authentication required as it's called by Stripe)
// IMPORTANT: This must use express.raw() middleware, NOT express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;