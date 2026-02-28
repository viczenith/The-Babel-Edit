import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prismaClient.js';
import { sendEmail } from '../utils/emailService.js';
import { appendAuditLog } from './adminController.js';

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
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create reset URL — use /en/ locale prefix for universal compatibility
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/en/auth/reset-password?token=${resetJWT}`;

    // Branded email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - The Babel Edit</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <!-- Card -->
            <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: #7f1d1d; padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">The Babel Edit</h1>
              </div>

              <!-- Body -->
              <div style="padding: 32px 24px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">Password Reset Request</h2>
                
                <p style="color: #374151; margin: 0 0 16px;">Hello ${user.firstName || 'there'},</p>
                
                <p style="color: #374151; margin: 0 0 24px;">We received a request to reset the password for your The Babel Edit account. Click the button below to choose a new password:</p>
                
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Reset Password</a>
                </div>
                
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #ef4444; font-size: 13px; margin: 0 0 24px; background: #fef2f2; padding: 10px 12px; border-radius: 6px;">${resetUrl}</p>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 8px;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">⏰ This link will expire in <strong>1 hour</strong> for security reasons.</p>
                  <p style="color: #6b7280; font-size: 13px; margin: 0;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
                <p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0;">This is an automated email — please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    console.log('[PASSWORD_RESET] About to call sendEmail for:', user.email);
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - The Babel Edit',
      html: emailHtml
    });
    console.log('[PASSWORD_RESET] sendEmail call completed');

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
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
      const confirmationHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed - The Babel Edit</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: #7f1d1d; padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">The Babel Edit</h1>
                </div>

                <!-- Body -->
                <div style="padding: 32px 24px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background: #dcfce7; line-height: 56px; font-size: 28px;">✓</div>
                  </div>
                  
                  <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px; text-align: center;">Password Changed Successfully</h2>
                  
                  <p style="color: #374151; margin: 0 0 16px;">Hello ${user.firstName || 'there'},</p>
                  
                  <p style="color: #374151; margin: 0 0 16px;">Your password for your The Babel Edit account has been successfully updated.</p>
                  
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
                    <p style="color: #b91c1c; font-size: 13px; font-weight: 600; margin: 0;">⚠️ Didn't make this change?</p>
                    <p style="color: #b91c1c; font-size: 13px; margin: 4px 0 0;">If you didn't request this password change, please contact our support team immediately to secure your account.</p>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background: #f9fafb; padding: 20px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
                  <p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0;">This is an automated email — please do not reply.</p>
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
