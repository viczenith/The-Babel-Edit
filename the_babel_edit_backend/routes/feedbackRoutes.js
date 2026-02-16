import express from "express";
import { createFeedback, getAllFeedbacks, updateFeedback, deleteFeedback, getFeaturedFeedbacks } from '../controllers/feedbackController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/featured', getFeaturedFeedbacks);
router.post('/', authenticateToken, createFeedback);
router.get('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAllFeedbacks);
router.put('/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateFeedback);
router.delete('/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteFeedback);

export default router;