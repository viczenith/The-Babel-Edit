import express from 'express';
import passport from 'passport';
import { 
  register, 
  login, 
  refreshToken, 
  verify, 
  logout, 
  getProfile, 
  updateProfile,
  updateAvatar,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getUserStats,
  toggleUserSuspension,
  toggleUserVerification,
  getUserDetail
} from '../controllers/userController.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { uploadSingle } from '../config/cloudinary.js';
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from '../utils/authUtils.js';

const router = express.Router();

// Local authentication routes
router.post('/register', register);
router.post('/login', login);

// Token management routes
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/verify', authenticateToken, verify);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/profile/avatar', authenticateToken, uploadSingle, updateAvatar);

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // req.user now contains { user, accessToken, refreshToken }
      const { user, accessToken, refreshToken } = req.user;

      // Set refresh token as httpOnly cookie
      setRefreshTokenCookie(res, refreshToken);

      // Remove sensitive data from user object
      const { password, refreshToken: _, ...userWithoutSensitiveData } = user;

      // Create the response data
      const authData = {
        user: userWithoutSensitiveData,
        accessToken // Send access token to frontend
      };

      const userData = encodeURIComponent(JSON.stringify(authData));

      // Redirect to frontend with auth data (use /en as default locale)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/en/auth/callback?data=${userData}`);
      
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/en/auth/login?error=oauth_failed`);
    }
  }
);

// Optional: Add a route to handle the Google auth success on frontend
router.get('/auth/google/success', (req, res) => {
  // This could be used if you want to handle the redirect differently
  res.json({ message: 'Google authentication successful' });
});

// Admin user management routes - stats must be before :userId to prevent path conflict
router.get('/admin/users/stats', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getUserStats);
router.get('/admin/users', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getAllUsers);
router.get('/admin/users/:userId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), getUserDetail);
router.put('/admin/users/:userId/role', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), updateUserRole);
router.patch('/admin/users/:userId/suspend', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), toggleUserSuspension);
router.patch('/admin/users/:userId/verify', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), toggleUserVerification);
router.delete('/admin/users/:userId', authenticateToken, checkRole(['ADMIN', 'SUPER_ADMIN']), deleteUser);

export default router;
