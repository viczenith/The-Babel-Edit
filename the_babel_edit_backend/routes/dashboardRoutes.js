import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { uploadDashboardImage } from '../config/cloudinary.js';

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
router.post("/admin/dashboard/toggle-visibility", authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), dashboardController.toggleSectionVisibility);

// Dashboard image upload route (uses ecommerce/dashboard/<section>/ folder)
// Query param ?folder=hero-slides | highlights | banners | landing-page
router.post('/admin/dashboard/upload-image',
  authenticateToken,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  (req, res, next) => {
    uploadDashboardImage(req, res, (err) => {
      if (err) {
        console.error('Dashboard upload error:', err);
        return res.status(400).json({ message: err.message || 'Upload failed', error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    try {
      let imageUrl;
      if (req.file.path && req.file.path.startsWith('http')) {
        imageUrl = req.file.path;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }
      const publicId = req.file.public_id || req.file.filename;
      res.json({ message: 'Image uploaded successfully', imageUrl, publicId });
    } catch (e) {
      res.status(500).json({ message: 'Error processing upload response' });
    }
  }
);

export default router;

