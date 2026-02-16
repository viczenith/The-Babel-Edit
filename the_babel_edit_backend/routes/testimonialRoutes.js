import express from 'express';
import { getFeaturedTestimonials, addTestimonial, removeTestimonial, getPublicTestimonials } from '../controllers/testimonialController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public route to get full testimonial data
router.get('/public', getPublicTestimonials);

// Admin routes for managing testimonials
router.get('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getFeaturedTestimonials);
router.post('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), addTestimonial);
router.delete('/:reviewId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), removeTestimonial);

export default router;
