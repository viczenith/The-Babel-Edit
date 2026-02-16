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

    // Always return success to prevent email enumeration attacks
    const successMessage = 'If an account with that email exists, we have sent a password reset link.';

    if (!user) {
      return res.json({ message: successMessage });
    }

    // Check if user has a password (not OAuth only)
    if (!user.password) {
      return res.json({ message: successMessage });
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

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetJWT}`;

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - The Babel Edit</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            
            <p>Hello ${user.firstName || 'there'},</p>
            
            <p>We received a request to reset your password for your The Babel Edit account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Babel Edit Team</p>
              <p><em>This is an automated email. Please do not reply to this email.</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - The Babel Edit',
      html: emailHtml
    });

    await appendAuditLog({
      action: 'request_password_reset', resource: 'User', resourceId: user.id,
      details: { email: user.email },
      user: { id: user.id, email: user.email }, req,
    });

    res.json({ message: successMessage });

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
            <title>Password Changed - The Babel Edit</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .footer { margin-top: 30px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Changed Successfully</h1>
              </div>
              
              <p>Hello ${user.firstName || 'there'},</p>
              
              <p>Your password has been successfully changed for your The Babel Edit account.</p>
              
              <p>If you didn't make this change, please contact our support team immediately.</p>
              
              <div class="footer">
                <p>Best regards,<br>The Babel Edit Team</p>
                <p><em>This is an automated email. Please do not reply to this email.</em></p>
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
