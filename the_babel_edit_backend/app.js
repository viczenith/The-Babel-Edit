import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import Redis from 'ioredis';
import { RedisStore } from 'connect-redis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import prisma from './prismaClient.js';

// Only load .env in development
// if (process.env.NODE_ENV !== 'production') {
// }
dotenv.config();

// Import routes
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoute.js';
import orderRoutes from './routes/orderRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import passwordResetRoutes from './routes/passwordResetRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import typeRoutes from './routes/typeRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

// Import passport config
import './config/passport.js';

const app = express();


// Security middleware
app.use(helmet());

// CORS configuration - build allowed origins safely and allow localhost in dev
const allowedOriginsSet = new Set();
if (process.env.FRONTEND_URL) {
  allowedOriginsSet.add(process.env.FRONTEND_URL);
  try {
    allowedOriginsSet.add(process.env.FRONTEND_URL.replace('http:', 'https:'));
  } catch (e) {
    // ignore
  }
}
if (process.env.FRONTEND_URL_PRODUCTION) {
  allowedOriginsSet.add(process.env.FRONTEND_URL_PRODUCTION);
}
allowedOriginsSet.add('https://www.thebabeledit.com');
allowedOriginsSet.add('https://thebabeledit.com');

// Add common local dev hosts so requests from different dev ports are allowed
if (process.env.NODE_ENV !== 'production') {
  allowedOriginsSet.add('http://localhost:3000');
  allowedOriginsSet.add('http://127.0.0.1:3000');
  allowedOriginsSet.add('http://localhost:3001');
  allowedOriginsSet.add('http://localhost:3002');
}

const allowedOrigins = Array.from(allowedOriginsSet);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Allow any localhost origin in development so varying dev ports won't be blocked
    try {
      if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
        return callback(null, true);
      }
    } catch (e) {
      // ignore
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Stripe webhook must be mounted BEFORE express.json() to receive raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Session configuration
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false }
  });

  redisClient.on('error', (err) => {
    console.warn('Redis client error:', err && err.message ? err.message : err);
  });
}

let sessionStore = undefined;
if (process.env.NODE_ENV === 'production' && redisClient) {
  sessionStore = new RedisStore({ client: redisClient });
}

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET or ACCESS_TOKEN_SECRET must be set in production');
    return crypto.randomBytes(32).toString('hex');
  })(),
  resave: false,
  saveUninitialized: false,
  store: sessionStore, // memory store when undefined
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
 
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files as static assets with CORS headers
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve static files with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for image serving
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Range');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  // Override some helmet defaults for this static file response so browser
  // can load images cross-origin from our uploads host.
  // Helmet may set Cross-Origin-Resource-Policy: same-origin which blocks
  // cross-origin image loads even when CORS headers are present.
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Call express.static
  express.static(uploadsPath)(req, res, next);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});


import { getSettingValue } from './controllers/settingsController.js';

// ── Maintenance mode middleware ──
// Blocks all non-admin API requests when maintenance_mode is "true".
// Admin/super-admin users and health/settings/auth endpoints are always allowed.
const maintenanceMiddleware = async (req, res, next) => {
  // Always allow these paths regardless of maintenance mode
  // Use req.originalUrl since middleware is mounted on /api (req.path strips the mount prefix)
  const fullPath = req.originalUrl || req.path;
  const exemptPaths = [
    '/api/health',
    '/api/admin/settings',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/verify',
  ];
  if (exemptPaths.some(p => fullPath.startsWith(p))) return next();

  try {
    const maintenanceMode = await getSettingValue('maintenance_mode', 'false');
    if (maintenanceMode === 'true') {
      // Check if user is admin/super_admin via token (optional parse, don't block on error)
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = await import('jsonwebtoken');
          const token = authHeader.split(' ')[1];
          const decoded = jwt.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
          const role = (decoded?.role || '').toUpperCase();
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') return next();
        } catch {
          // token invalid — still blocked
        }
      }
      return res.status(503).json({
        message: 'The site is currently under maintenance. Please check back shortly.',
        maintenance: true,
      });
    }
  } catch {
    // If settings DB query fails, don't block traffic
  }
  next();
};

// API routes
app.use('/api', maintenanceMiddleware);

// API routes
app.use('/api/auth', userRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/admin/testimonials', testimonialRoutes);
app.use('/api/feedback', feedbackRoutes);
// Mount dashboard routes before more generic /api/admin mounts so admin/dashboard
// endpoints defined in `dashboardRoutes` are not shadowed by `adminRoutes`.
app.use('/api', dashboardRoutes); // Dashboard routes mounted under /api (now /api/dashboard/* and /api/admin/dashboard/*)
app.use('/api/admin', adminRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/types', typeRoutes); // Product types and categories management

// 404 handler
app.use('/*splat', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default app;
