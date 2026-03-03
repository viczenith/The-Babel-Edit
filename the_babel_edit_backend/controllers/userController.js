import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';
import { getSettingValue } from './settingsController.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { sendEmail } from '../utils/emailService.js';

import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from '../utils/authUtils.js';
import { validateAndConsumeToken } from './superAdminTokenController.js';

// Normalize user id from various token shapes
const getUserIdFromReq = (req) => {
  const u = req.user;
  if (!u) return null;
  if (typeof u === 'string') return u;
  if (u.userId && typeof u.userId === 'string') return u.userId;
  if (u.id && typeof u.id === 'string') return u.id;
  if (u.sub && typeof u.sub === 'string') return u.sub;
  return null;
};

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, isAgree } = req.body;
    const inviteToken = req.body.inviteToken || req.body.token || null;
    // Only allow SUPER_ADMIN role via invite token; all other signups are USER
    const requestedRole = req.body.role;
    const isSuperAdminRequest = requestedRole && requestedRole.toUpperCase() === 'SUPER_ADMIN';

    // Check if registration is enabled (skip check for SUPER_ADMIN invite registrations)
    if (!isSuperAdminRequest) {
      const registrationEnabled = await getSettingValue('new_user_registration', 'true');
      if (registrationEnabled === 'false') {
        return res.status(403).json({ message: 'New user registration is currently disabled. Please try again later.' });
      }
    }

    // Validate input
    if (!firstName || !lastName || !email || !password || isAgree === false) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // If attempting to register as SUPER_ADMIN require a valid invite token
    if (isSuperAdminRequest) {
      const consumed = await validateAndConsumeToken(inviteToken);
      if (!consumed) {
        return res.status(403).json({ message: 'Invalid or expired invite token for SUPER ADMIN registration' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user — only SUPER_ADMIN (with valid invite token) gets elevated role;
    // all other public registrations default to USER
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isVerified: true,
        isAgree: false,
        role: isSuperAdminRequest ? 'SUPER_ADMIN' : undefined
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // Remove password from response
    const { password: _, refreshToken: __, ...userWithoutSensitiveData } = user;

    await appendAuditLog({
      action: 'user_register', resource: 'User', resourceId: user.id,
      details: { userId: user.id, email: user.email, role: user.role },
      user: { id: user.id, email: user.email, role: user.role }, req,
    });

    // Send welcome email (non-blocking)
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const welcomeHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to The Babel Edit</title>
          </head>
          <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f0eb;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px;">
              <!-- Outer Card -->
              <div style="background: #ffffff; border-radius: 2px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">
                
                <!-- Header -->
                <div style="background: #1a1a1a; padding: 40px 32px; text-align: center;">
                  <p style="color: #c9a96e; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Welcome To</p>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 400; margin: 0; letter-spacing: 2px; font-family: 'Georgia', serif;">THE BABEL EDIT</h1>
                  <div style="width: 40px; height: 1px; background: #c9a96e; margin: 16px auto 0;"></div>
                </div>

                <!-- Hero Section -->
                <div style="padding: 40px 32px 24px; text-align: center; background: linear-gradient(180deg, #fdfbf7 0%, #ffffff 100%);">
                  <h2 style="font-size: 24px; font-weight: 400; color: #1a1a1a; margin: 0 0 16px; font-family: 'Georgia', serif;">Hello, ${firstName}!</h2>
                  <p style="color: #555; font-size: 15px; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">Thank you for joining our community of style-conscious individuals.</p>
                  <p style="color: #555; font-size: 15px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">At The Babel Edit, we curate fashion that speaks to every occasion — effortlessly.</p>
                </div>

                <!-- Divider -->
                <div style="padding: 0 32px;"><div style="border-top: 1px solid #e8e0d4;"></div></div>

                <!-- Features Grid -->
                <div style="padding: 32px;">
                  <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin: 0 0 24px; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif;">Your Membership Benefits</p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f0ebe3;">
                        <table cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="width: 40px; vertical-align: top;">
                            <div style="width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">🛍️</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">Curated Collections</p>
                            <p style="font-size: 13px; color: #777; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Handpicked fashion from around the world</p>
                          </td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f0ebe3;">
                        <table cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="width: 40px; vertical-align: top;">
                            <div style="width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">❤️</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">Personal Wishlist</p>
                            <p style="font-size: 13px; color: #777; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Save pieces you love and shop when you're ready</p>
                          </td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f0ebe3;">
                        <table cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="width: 40px; vertical-align: top;">
                            <div style="width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">✨</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">New Arrivals First</p>
                            <p style="font-size: 13px; color: #777; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Be the first to discover our latest drops</p>
                          </td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; vertical-align: top;">
                        <table cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="width: 40px; vertical-align: top;">
                            <div style="width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">🎁</div>
                          </td>
                          <td style="padding-left: 12px;">
                            <p style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; font-family: 'Helvetica Neue', Arial, sans-serif;">Exclusive Offers</p>
                            <p style="font-size: 13px; color: #777; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Members-only discounts and early access to sales</p>
                          </td>
                        </tr></table>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA -->
                <div style="padding: 8px 32px 40px; text-align: center;">
                  <a href="${frontendUrl}/en/products" style="display: inline-block; padding: 16px 48px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">Explore the Collection</a>
                  <p style="color: #999; font-size: 12px; margin: 16px 0 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Free shipping on your first order over $100</p>
                </div>

                <!-- Footer -->
                <div style="background: #1a1a1a; padding: 32px; text-align: center;">
                  <p style="color: #c9a96e; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">The Babel Edit</p>
                  <p style="margin: 0 0 12px;">
                    <a href="${frontendUrl}/en/products" style="color: #999; font-size: 12px; text-decoration: none; margin: 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Shop</a>
                    <span style="color: #444;">|</span>
                    <a href="${frontendUrl}/en/about" style="color: #999; font-size: 12px; text-decoration: none; margin: 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">About</a>
                    <span style="color: #444;">|</span>
                    <a href="${frontendUrl}/en/contact" style="color: #999; font-size: 12px; text-decoration: none; margin: 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Contact</a>
                  </p>
                  <div style="width: 30px; height: 1px; background: #333; margin: 16px auto;"></div>
                  <p style="color: #666; font-size: 11px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      sendEmail({
        to: email,
        subject: 'Welcome to The Babel Edit! 🛍️',
        html: welcomeHtml
      }).catch((emailErr) => {
        console.error(`❌ Welcome email failed for ${email}:`, emailErr.message || emailErr);
      });
    } catch (emailError) {
      // Don't fail registration if welcome email fails
      console.error(`❌ Welcome email error for ${email}:`, emailError.message || emailError);
    }

    res.status(201).json({
      message: 'User registered successfully',
      accessToken, // Frontend expects this
      user: userWithoutSensitiveData
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is suspended
    if (user.isSuspended) {
      await appendAuditLog({
        action: 'user_login_blocked', resource: 'User', resourceId: user.id,
        details: { email, reason: 'account_suspended' },
        severity: 'warning', req,
      });
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Check if user has password (Google OAuth users don't have passwords)
    if (!user.password) {
      return res.status(401).json({
        message: 'This account was created with Google. Please use Google login.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Audit failed login attempt
      await appendAuditLog({
        action: 'user_login_failed', resource: 'User',
        details: { email, reason: 'invalid_password' },
        severity: 'warning', req,
      });
      // Debug: try to hash the provided password with the same salt to see if it matches
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store the refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    // Set the refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // Remove sensitive data from response
    const { password: _, refreshToken: __, ...userWithoutSensitiveData } = user;

    await appendAuditLog({
      action: 'user_login', resource: 'User', resourceId: user.id,
      details: { userId: user.id, email: user.email, role: user.role },
      user: { id: user.id, email: user.email, role: user.role }, req,
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: userWithoutSensitiveData
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Refresh token endpoint
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user and verify stored refresh token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update stored refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    // Set new refresh token cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      accessToken: newAccessToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify token endpoint
export const verify = async (req, res) => {
  try {
    // User data is attached by the authenticateToken middleware
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    if (process.env.NODE_ENV !== 'production') console.debug('Verify: resolved userId', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout endpoint
export const logout = async (req, res) => {
  try {
    // Clear refresh token from database if user is authenticated
    const userId = getUserIdFromReq(req);
    if (userId) {
      try {
        await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('Logout: failed to clear refresh token', err);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    await appendAuditLog({
      action: 'user_logout', resource: 'User', resourceId: userId,
      details: { userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.error('GetProfile: invalid token payload');
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.error('UpdateProfile: invalid token payload');
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await appendAuditLog({
      action: 'update_profile', resource: 'User', resourceId: userId,
      details: { userId, firstName, lastName },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user avatar
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    // Cloudinary returns full URL in req.file.path; local storage gives filename
    let avatarUrl;
    if (req.file.path && req.file.path.startsWith('http')) {
      avatarUrl = req.file.path;
    } else {
      const { getBaseUrl } = await import('../utils/urlUtils.js');
      avatarUrl = `${getBaseUrl(req)}/uploads/${req.file.filename}`;
    }

    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.error('UpdateAvatar: invalid token payload');
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Delete old avatar from Cloudinary before saving new one
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (existingUser?.avatar) {
      deleteFromCloudinary(existingUser.avatar).catch(e => console.warn('⚠️ Avatar Cloudinary cleanup:', e.message));
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true
      },
    });

    await appendAuditLog({
      action: 'update_avatar', resource: 'User', resourceId: userId,
      details: { userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({
      message: 'Avatar updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Get all users
export const getAllUsers = async (req, res) => {
  try {
    // SQLite doesn't support case-insensitive mode, only PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://');
    const strContains = (val) => isPostgreSQL ? { contains: val, mode: 'insensitive' } : { contains: val };

    const {
      page = 1,
      limit = 20,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const where = {};

    // Search functionality
    if (search) {
      where.OR = [
        { email: strContains(search) },
        { firstName: strContains(search) },
        { lastName: strContains(search) }
      ];
    }

    // Role filter
    if (role && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    // Build orderBy clause
    const validSortFields = ['email', 'firstName', 'lastName', 'createdAt', 'role'];
    const orderBy = {};

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Execute query
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isVerified: true,
          isSuspended: true,
          googleId: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true, reviews: true } }
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        search,
        role
      },
      sorting: {
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Admin: Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role exists
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'Role is required' });
    }

    // Validate role value
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Prevent self-demotion for super admin
    if (req.user.userId === userId && (req.user.role || '').toUpperCase() === 'SUPER_ADMIN' && role.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'Cannot demote yourself from SUPER_ADMIN role' });
    }

    // Only super admin can promote to super admin
    if (role.toUpperCase() === 'SUPER_ADMIN' && (req.user.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only SUPER_ADMIN can promote users to SUPER_ADMIN' });
    }

    // Capture old role for audit diff
    const oldUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Audit log the role change
    await appendAuditLog({
      action: 'update_user_role',
      resource: 'User',
      resourceId: userId,
      details: { userId, newRole: updatedUser.role },
      previousValues: oldUser ? { role: oldUser.role } : null,
      severity: updatedUser.role === 'SUPER_ADMIN' ? 'critical' : 'warning',
      user: { id: req.user.userId || null, email: req.user.email || null, role: req.user.role || null },
      req,
    });

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user role error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

// Admin: Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (req.user.userId === userId) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    // Get user to check role
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only super admin can delete admin/super admin users
    if (['ADMIN', 'SUPER_ADMIN'].includes(userToDelete.role) && (req.user.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only SUPER_ADMIN can delete admin users' });
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Audit log the deletion
    await appendAuditLog({
      action: 'delete_user',
      resource: 'User',
      resourceId: userId,
      details: { userId },
      severity: 'critical',
      user: { id: req.user.userId || null, email: req.user.email || null, role: req.user.role || null },
      req,
    });

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Admin: Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const [totalUsers, usersByRole, recentUsers] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      }),
      
      // Recent users (last 30 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      totalUsers,
      usersByRole: usersByRole.map(group => ({
        role: group.role,
        count: group._count.id
      })),
      recentUsers
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
};

// Admin: Toggle user suspension
export const toggleUserSuspension = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-suspension
    if (req.user.userId === userId) {
      return res.status(400).json({ message: 'Cannot suspend yourself' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isSuspended: true, isPrimary: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cannot suspend primary super admin
    if (user.isPrimary) {
      return res.status(403).json({ message: 'Cannot suspend the primary super admin account' });
    }

    // Only super admin can suspend admin/super admin users
    if (['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (req.user.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only SUPER_ADMIN can suspend admin users' });
    }

    const newStatus = !user.isSuspended;

    await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: newStatus }
    });

    await appendAuditLog({
      action: newStatus ? 'suspend_user' : 'unsuspend_user',
      resource: 'User',
      resourceId: userId,
      details: { userId, email: user.email, isSuspended: newStatus },
      previousValues: { isSuspended: user.isSuspended },
      severity: 'warning',
      user: { id: req.user.userId || null, email: req.user.email || null, role: req.user.role || null },
      req,
    });

    res.json({
      message: `User ${newStatus ? 'suspended' : 'unsuspended'} successfully`,
      isSuspended: newStatus
    });

  } catch (error) {
    console.error('Toggle suspension error:', error);
    res.status(500).json({ message: 'Failed to update user suspension status' });
  }
};

// Admin: Toggle user verification
export const toggleUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isVerified: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = !user.isVerified;

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: newStatus }
    });

    await appendAuditLog({
      action: newStatus ? 'verify_user' : 'unverify_user',
      resource: 'User',
      resourceId: userId,
      details: { userId, email: user.email, isVerified: newStatus },
      previousValues: { isVerified: user.isVerified },
      severity: 'info',
      user: { id: req.user.userId || null, email: req.user.email || null, role: req.user.role || null },
      req,
    });

    res.json({
      message: `User ${newStatus ? 'verified' : 'unverified'} successfully`,
      isVerified: newStatus
    });

  } catch (error) {
    console.error('Toggle verification error:', error);
    res.status(500).json({ message: 'Failed to update user verification status' });
  }
};

// Admin: Get user detail with orders, addresses, reviews
export const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        googleId: true,
        avatar: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                productName: true,
                productImage: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        addresses: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            phone: true,
            isDefault: true,
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            product: {
              select: { id: true, name: true, imageUrl: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: { orders: true, reviews: true, wishlistItems: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compute user metrics
    const totalSpent = user.orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = user.orders.length > 0 ? totalSpent / user.orders.length : 0;

    res.json({
      user: {
        ...user,
        metrics: {
          totalOrders: user._count.orders,
          totalReviews: user._count.reviews,
          totalWishlistItems: user._count.wishlistItems,
          totalSpent: Math.round(totalSpent * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        }
      }
    });

  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
};
