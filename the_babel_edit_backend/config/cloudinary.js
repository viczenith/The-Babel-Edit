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

const storage = isConfigured ? new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecommerce',
    allowed_formats: ['jpeg', 'png', 'jpg'],
  },
}) : localStorage; // Fallback to local disk storage if not configured

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to handle single image upload
export const uploadSingle = upload.single('image');

// Middleware to handle multiple images upload (up to 5 images)
export const uploadMultiple = upload.array('images', 5);

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