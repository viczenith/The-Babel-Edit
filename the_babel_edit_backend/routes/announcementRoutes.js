import express from 'express';
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public route - get active announcements (no auth needed)
router.get('/active', getActiveAnnouncements);

// Admin routes
router.get('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAllAnnouncements);
router.post('/', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), createAnnouncement);
router.put('/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateAnnouncement);
router.patch('/:id/toggle', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), toggleAnnouncement);
router.delete('/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteAnnouncement);

export default router;
