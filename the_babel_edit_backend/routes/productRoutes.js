import express from 'express';
import { getBaseUrl } from '../utils/urlUtils.js';
import {
  getCollections,
  getCollection,
  getProductsByCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionStats
} from '../controllers/collectionController.js';
import {
  getProducts,
  getProductById,
  getSearchSuggestions,
  getFilterOptions,
  checkSkuExists,
  createProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  getFeaturedProducts
} from '../controllers/productController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../config/cloudinary.js';

const router = express.Router();

// Public collection routes
router.get('/collections', getCollections);
router.get('/collections/:identifier', getCollection);
router.get('/collections/:name/products', getProductsByCollection);

// Public product routes
router.get('/products', getProducts);
router.get('/products/featured', getFeaturedProducts);
router.get('/products/filter-options', getFilterOptions);
// Public SKU check (used by admin UI for pre-submit validation)
router.get('/products/check-sku', checkSkuExists);
router.get('/search/suggestions', getSearchSuggestions);
router.get('/products/:id', getProductById);

// Handle preflight OPTIONS requests for uploads
router.options('/admin/products/upload-image', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Image upload routes (Admin only)
router.post('/admin/products/upload-image', 
  authenticateToken, 
  checkRole(['ADMIN', 'SUPER_ADMIN']), 
  (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
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
      // Handle both Cloudinary (req.file.path is full CDN URL) and local storage (req.file.filename)
      let imageUrl;
      if (req.file.path && req.file.path.startsWith('http')) {
        // Cloudinary URL - use as-is
        imageUrl = req.file.path;
      } else {
        // Local storage - store as RELATIVE path so resolveUploadUrls middleware
        // can dynamically resolve it to the correct server URL in any environment
        imageUrl = `/uploads/${req.file.filename}`;
      }
      const publicId = req.file.public_id || req.file.filename;
      
      // Ensure CORS headers are present on this JSON response for dev origins
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.json({ 
        message: 'Image uploaded successfully',
        imageUrl,
        publicId
      });
    } catch (e) {
      res.status(500).json({ message: 'Error processing upload response' });
    }
  }
);

router.post('/admin/products/upload-images', 
  authenticateToken, 
  checkRole(['ADMIN', 'SUPER_ADMIN']), 
  (req, res, next) => {
    uploadMultiple(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ message: err.message || 'Upload failed', error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    try {
      const images = req.files.map(file => {
        let url;
        if (file.path && file.path.startsWith('http')) {
          // Cloudinary URL - use as-is
          url = file.path;
        } else {
          // Local storage - store as RELATIVE path so resolveUploadUrls middleware
          // can dynamically resolve it to the correct server URL
          url = `/uploads/${file.filename}`;
        }
        return {
          url,
          publicId: file.public_id || file.filename
        };
      });
      // Ensure CORS headers are present on this JSON response for dev origins
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.json({ 
        message: 'Images uploaded successfully',
        images
      });
      
    } catch (e) {
      console.error('Error processing upload response:', e);
      res.status(500).json({ message: 'Error processing upload response', error: e.message });
    }
  }
);

// Admin collection routes
router.post('/admin/collections', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), createCollection);
router.put('/admin/collections/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateCollection);
router.delete('/admin/collections/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteCollection);
router.get('/admin/collections/:id/stats', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getCollectionStats);

// Admin product routes
router.get('/admin/products', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getProducts);
router.post('/admin/products', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), createProduct);
router.put('/admin/products/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateProduct);
router.delete('/admin/products/:id', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteProduct);
router.delete('/admin/products/:id/hard', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), hardDeleteProduct);

export default router;