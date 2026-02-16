import express from 'express';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { getAuditLogs, getAuditStats, addAuditLog, exportAuditLogs, migrateAuditLogs } from '../controllers/adminController.js';
import { createToken, listTokens, revokeToken } from '../controllers/superAdminTokenController.js';

const router = express.Router();

// Audit logs (ADMIN and SUPER_ADMIN)
router.get('/audit-logs', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAuditLogs);
router.get('/audit-logs/stats', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAuditStats);
router.get('/audit-logs/export', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), exportAuditLogs);
router.post('/audit-logs', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), addAuditLog);
router.post('/audit-logs/migrate', authenticateToken, checkRole(['SUPER_ADMIN']), migrateAuditLogs);

// SuperAdmin token management (only SUPER_ADMIN can access; controller checks primary flag)
router.post('/superadmin/tokens', authenticateToken, checkRole(['SUPER_ADMIN']), createToken);
router.get('/superadmin/tokens', authenticateToken, checkRole(['SUPER_ADMIN']), listTokens);
router.post('/superadmin/tokens/:id/revoke', authenticateToken, checkRole(['SUPER_ADMIN']), revokeToken);

export default router;
