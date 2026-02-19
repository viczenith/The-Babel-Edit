import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/admin/analytics?period=month
router.get('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAnalytics);

export default router;
