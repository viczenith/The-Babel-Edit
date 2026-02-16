import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  resetSettings,
  getPublicSetting,
  getPublicSettingsBatch,
} from '../controllers/settingsController.js';

const router = express.Router();

// Public — batch fetch all public-safe settings (no auth required)
router.get('/public', getPublicSettingsBatch);
// Public — single key fetch (no auth required)
router.get('/public/:key', getPublicSetting);

// Admin / Super-Admin — full settings CRUD
router.get('/', authenticateToken, checkRole(['SUPER_ADMIN']), getAllSettings);
router.put('/bulk', authenticateToken, checkRole(['SUPER_ADMIN']), bulkUpdateSettings);
router.post('/reset', authenticateToken, checkRole(['SUPER_ADMIN']), resetSettings);
router.get('/:key', authenticateToken, checkRole(['SUPER_ADMIN']), getSetting);
router.patch('/:key', authenticateToken, checkRole(['SUPER_ADMIN']), updateSetting);

export default router;
