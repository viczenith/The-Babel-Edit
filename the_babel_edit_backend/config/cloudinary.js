import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Validate Cloudinary credentials
const validateCloudinaryConfig = () => {
  const missingVars = [];
  if (!process.env.CLOUD_NAME) missingVars.push('CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing Cloudinary credentials: ${missingVars.join(', ')}`);
    console.warn('Using local file storage instead. To use Cloudinary, set: CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    return false;
  }
  return true;
};

const isConfigured = validateCloudinaryConfig();

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
}

// Local storage configuration with proper file naming
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// ── Helpers ────────────────────────────────────────────────────
/** Turn any string into a URL-safe slug for folder names */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ── Factory: static-folder uploader ───────────────────────────
const createStaticUploader = (folder = 'ecommerce/general') => {
  const storage = isConfigured
    ? new CloudinaryStorage({
        cloudinary,
        params: {
          folder,
          allowed_formats: ['jpeg', 'png', 'jpg'],
        },
      })
    : localStorage;

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
};

// ── Factory: dynamic-folder uploader ──────────────────────────
// For products:  reads `req.query.category` and `req.query.type`
//   e.g. POST /upload-image?category=women&type=dresses
//        → Cloudinary folder: ecommerce/products/women/dresses
// For dashboard: reads `req.query.folder`
//   e.g. POST /upload-image?folder=hero-slides
//        → Cloudinary folder: ecommerce/dashboard/hero-slides
const createDynamicUploader = (baseFolder = 'ecommerce/products') => {
  const storage = isConfigured
    ? new CloudinaryStorage({
        cloudinary,
        params: (req, _file) => {
          // Build sub-path from category + type (products) or folder (dashboard)
          const parts = [baseFolder];
          if (req.query.category) parts.push(slugify(req.query.category));
          if (req.query.type)     parts.push(slugify(req.query.type));
          if (req.query.folder)   parts.push(slugify(req.query.folder));
          const folder = parts.join('/');

          return {
            folder,
            allowed_formats: ['jpeg', 'png', 'jpg'],
          };
        },
      })
    : localStorage;

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
};

// ── Folder-specific uploaders ──────────────────────────────────
// Products get DYNAMIC sub-folders (ecommerce/products/<product-slug>/)
const productUpload   = createDynamicUploader('ecommerce/products');

// Dashboard gets DYNAMIC sub-folders (ecommerce/dashboard/<section>/)
//   ?folder=hero-slides | ?folder=highlights | ?folder=banners
const dashboardUpload = createDynamicUploader('ecommerce/dashboard');

// Avatars & general use a single static folder each
const avatarUpload    = createStaticUploader('ecommerce/avatars');
const generalUpload   = createStaticUploader('ecommerce/general');

// ── Product image middleware (dynamic per-product folders) ─────
export const uploadProductImage  = productUpload.single('image');
export const uploadProductImages = productUpload.array('images', 5);

// ── Avatar middleware ──────────────────────────────────────────
export const uploadAvatar = avatarUpload.single('image');

// ── Dashboard middleware (dynamic per-section folders) ─────────
export const uploadDashboardImage  = dashboardUpload.single('image');
export const uploadDashboardImages = dashboardUpload.array('images', 5);

// ── Legacy / generic (kept for backward compatibility) ────────
export const upload = generalUpload;
export const uploadSingle   = generalUpload.single('image');
export const uploadMultiple = generalUpload.array('images', 5);

// Error handling middleware for multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 5MB', code: 'LIMIT_FILE_SIZE' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Too many files uploaded', code: 'LIMIT_UNEXPECTED_FILE' });
    }
    return res.status(400).json({ message: err.message, code: err.code });
  }
  
  if (err) {
    console.error('Upload middleware error:', err);
    return res.status(500).json({ message: 'File upload failed', error: err.message });
  }
  
  next();
};