import express from 'express';
import { createReview, getReviews, deleteReview } from '../controllers/reviewController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/', authenticateToken, createReview);

// Admin routes
router.get('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getReviews);
router.delete('/:reviewId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteReview);

export default router;
