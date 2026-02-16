import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public endpoints - no auth required
router.get("/dashboard/hero-slides", dashboardController.getHeroSlides);
router.get("/dashboard/highlight-cards", dashboardController.getHighlightCards);
router.get("/dashboard/summer-banner", dashboardController.getSummerBanner);
router.get("/dashboard/landing-page", dashboardController.getLandingPage);
router.get("/dashboard/config", dashboardController.getDashboardConfig);

// Admin endpoints - auth required
router.post("/admin/dashboard/hero-slides", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.updateHeroSlides);
router.post("/admin/dashboard/highlight-cards", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.updateHighlightCards);
router.post("/admin/dashboard/summer-banner", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.updateSummerBanner);
router.post("/admin/dashboard/landing-page", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.updateLandingPage);
router.post("/admin/dashboard/config", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.updateDashboardConfig);

export default router;

