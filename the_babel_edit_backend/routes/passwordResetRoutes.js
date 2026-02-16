import express from 'express';
import { 
  requestPasswordReset, 
  verifyResetToken, 
  resetPassword, 
  changePassword 
} from '../controllers/passwordResetController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/request', requestPasswordReset);
router.get('/verify', verifyResetToken);
router.post('/reset', resetPassword);

// Protected routes
router.put('/change', authenticateToken, changePassword);

export default router;
