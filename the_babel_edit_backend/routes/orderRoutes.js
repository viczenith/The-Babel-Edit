import express from 'express';
import {
  createOrder,
  createOrderFromCheckout, 
  getUserOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  getAdminOrder,
  updateOrderStatus,
  confirmOrderPayment
} from '../controllers/orderController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Admin routes (require admin role) — must be before /:orderId to prevent path conflicts
router.get('/admin/all', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAllOrders);
router.get('/admin/:orderId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAdminOrder);
router.patch('/admin/:orderId/status', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateOrderStatus);

// User routes (require authentication)
router.post('/', authenticateToken, createOrderFromCheckout); 
router.post('/from-cart', authenticateToken, createOrder); 
router.get('/', authenticateToken, getUserOrders);
router.get('/:orderId', authenticateToken, getOrder);
router.patch('/:orderId/cancel', authenticateToken, cancelOrder);
router.patch('/:orderId/confirm-payment', authenticateToken, confirmOrderPayment);

export default router;