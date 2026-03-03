import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';
import { appendAuditLog } from './adminController.js';

// Use the same secret as the rest of the app, with JWT_SECRET as fallback
const getJwtSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this email address. Please check the email or create a new account.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user has a password (not OAuth only)
    if (!user.password) {
      // Determine which OAuth provider they used
      const provider = user.googleId ? 'Google' : 'a social login provider';
      return res.status(400).json({ 
        message: `This account uses ${provider} sign-in. Please use the "Sign in with ${provider}" button instead.`,
        code: 'OAUTH_ACCOUNT'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database (you might want to create a separate table for this)
    // For now, we'll store it in a hypothetical field or use JWT
    const resetJWT = jwt.sign(
      { 
        userId: user.id, 
        resetToken,
        purpose: 'password-reset'
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Create reset URL — use /en/ locale prefix for universal compatibility
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/en/auth/reset-password?token=${resetJWT}`;

    // Branded email template
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - The Babel Edit</title>
        </head>
        <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f0eb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px;">
            <div style="background: #ffffff; border-radius: 2px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">
              <!-- Header -->
              <div style="background: #1a1a1a; padding: 40px 32px; text-align: center;">
                <p style="color: #c9a96e; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Account Security</p>
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 400; margin: 0; letter-spacing: 2px; font-family: 'Georgia', serif;">THE BABEL EDIT</h1>
                <div style="width: 40px; height: 1px; background: #c9a96e; margin: 16px auto 0;"></div>
              </div>

              <!-- Body -->
              <div style="padding: 40px 32px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background: #fef3cd; line-height: 56px; font-size: 24px;">🔐</div>
                </div>
                
                <h2 style="font-size: 22px; font-weight: 400; color: #1a1a1a; margin: 0 0 20px; text-align: center; font-family: 'Georgia', serif;">Password Reset Request</h2>
                
                <p style="color: #555; font-size: 15px; margin: 0 0 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">Hello ${user.firstName || 'there'},</p>
                
                <p style="color: #555; font-size: 15px; margin: 0 0 28px; font-family: 'Helvetica Neue', Arial, sans-serif;">We received a request to reset the password for your account. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">Reset Password</a>
                </div>
                
                <p style="color: #888; font-size: 12px; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Or copy and paste this link into your browser:</p>
                <div style="word-break: break-all; color: #c9a96e; font-size: 12px; margin: 0 0 28px; background: #fdfbf7; padding: 12px 16px; border: 1px solid #e8e0d4; font-family: monospace;">${resetUrl}</div>
                
                <div style="border-top: 1px solid #e8e0d4; padding-top: 20px; margin-top: 8px;">
                  <p style="color: #888; font-size: 13px; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">⏱ This link expires in <strong style="color: #555;">1 hour</strong> for your security.</p>
                  <p style="color: #888; font-size: 13px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Didn't request this? You can safely ignore this email — your password will remain unchanged.</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #1a1a1a; padding: 32px; text-align: center;">
                <p style="color: #c9a96e; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">The Babel Edit</p>
                <div style="width: 30px; height: 1px; background: #333; margin: 0 auto 16px;"></div>
                <p style="color: #666; font-size: 11px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    console.log('[PASSWORD_RESET] About to call sendEmail for:', user.email);
    const sent = await sendEmail({
      to: user.email,
      subject: 'Password Reset - The Babel Edit',
      html: emailHtml
    });
    console.log('[PASSWORD_RESET] sendEmail call completed, sent:', sent);

    if (!sent) {
      return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }

    await appendAuditLog({
      action: 'request_password_reset', resource: 'User', resourceId: user.id,
      details: { email: user.email },
      user: { id: user.id, email: user.email }, req,
    });

    res.json({ message: 'Password reset link has been sent to your email.' });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify reset token
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ message: 'Invalid token purpose' });
      }

      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, firstName: true }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      res.json({ 
        message: 'Token is valid',
        user: {
          email: user.email,
          firstName: user.firstName
        }
      });

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Reset token has expired' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(400).json({ message: 'Invalid reset token' });
      } else {
        throw jwtError;
      }
    }

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Reset token and new password are required' 
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ message: 'Invalid token purpose' });
      }

      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Prevent token replay: if password hash changed since the token was issued,
      // the token has already been used (iat = issued at, in seconds)
      if (decoded.iat && user.updatedAt) {
        const tokenIssuedAt = decoded.iat * 1000; // convert to ms
        const userUpdatedAt = new Date(user.updatedAt).getTime();
        if (userUpdatedAt > tokenIssuedAt) {
          return res.status(400).json({ message: 'This reset link has already been used. Please request a new one.' });
        }
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear any refresh tokens for security
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          refreshToken: null // Force re-login
        }
      });

      // Send confirmation email
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const confirmationHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed - The Babel Edit</title>
          </head>
          <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f0eb;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px;">
              <div style="background: #ffffff; border-radius: 2px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">
                <!-- Header -->
                <div style="background: #1a1a1a; padding: 40px 32px; text-align: center;">
                  <p style="color: #c9a96e; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Account Security</p>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 400; margin: 0; letter-spacing: 2px; font-family: 'Georgia', serif;">THE BABEL EDIT</h1>
                  <div style="width: 40px; height: 1px; background: #c9a96e; margin: 16px auto 0;"></div>
                </div>

                <!-- Body -->
                <div style="padding: 40px 32px; text-align: center;">
                  <div style="margin-bottom: 24px;">
                    <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #e8f5e9; line-height: 64px; font-size: 28px;">✓</div>
                  </div>
                  
                  <h2 style="font-size: 22px; font-weight: 400; color: #1a1a1a; margin: 0 0 20px; font-family: 'Georgia', serif;">Password Updated Successfully</h2>
                  
                  <p style="color: #555; font-size: 15px; margin: 0 0 16px; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: left;">Hello ${user.firstName || 'there'},</p>
                  
                  <p style="color: #555; font-size: 15px; margin: 0 0 24px; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: left;">Your password has been successfully changed. You can now sign in with your new credentials.</p>
                  
                  <div style="background: #fdf6f6; border-left: 3px solid #c0392b; padding: 16px 20px; margin: 24px 0; text-align: left;">
                    <p style="color: #c0392b; font-size: 13px; font-weight: 600; margin: 0 0 4px; font-family: 'Helvetica Neue', Arial, sans-serif;">⚠ Didn't make this change?</p>
                    <p style="color: #777; font-size: 13px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Contact us immediately at <a href="mailto:${process.env.COMPANY_EMAIL || 'support@thebabeledit.com'}" style="color: #c9a96e; text-decoration: none;">${process.env.COMPANY_EMAIL || 'support@thebabeledit.com'}</a> to secure your account.</p>
                  </div>

                  <div style="text-align: center; margin-top: 28px;">
                    <a href="${frontendUrl}/en/auth/login" style="display: inline-block; padding: 16px 48px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">Sign In</a>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background: #1a1a1a; padding: 32px; text-align: center;">
                  <p style="color: #c9a96e; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">The Babel Edit</p>
                  <div style="width: 30px; height: 1px; background: #333; margin: 0 auto 16px;"></div>
                  <p style="color: #666; font-size: 11px; margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Password Changed - The Babel Edit',
        html: confirmationHtml
      });

      await appendAuditLog({
        action: 'reset_password', resource: 'User', resourceId: user.id,
        details: { userId: user.id }, severity: 'warning',
        user: { id: user.id, email: user.email }, req,
      });

      res.json({ message: 'Password has been reset successfully' });

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'Reset token has expired' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(400).json({ message: 'Invalid reset token' });
      } else {
        throw jwtError;
      }
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Change password (for authenticated users)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.password) {
      return res.status(400).json({ 
        message: 'Cannot change password for this account' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear refresh tokens
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        refreshToken: null // Force re-login on other devices
      }
    });

    await appendAuditLog({
      action: 'change_password', resource: 'User', resourceId: userId,
      details: { userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
