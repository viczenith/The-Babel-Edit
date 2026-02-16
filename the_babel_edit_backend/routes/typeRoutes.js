import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import * as typeController from '../controllers/typeController.js';

const router = express.Router();

// Public routes - Get categories and types (used by frontend filters)
router.get('/categories', typeController.getCategories);
router.get('/categories/:categoryId', typeController.getCategoryWithTypes);
router.get('/categories/:categoryId/types', typeController.getTypesByCategory);
router.get('/all-types', typeController.getAllTypes);

// Admin routes - Manage categories
router.post('/categories', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.createCategory);
router.patch('/categories/:categoryId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.updateCategory);
router.delete('/categories/:categoryId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.deleteCategory);

// Admin routes - Manage types
router.post('/types', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.createType);
router.patch('/types/:typeId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.updateType);
router.delete('/types/:typeId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), typeController.deleteType);

export default router;
