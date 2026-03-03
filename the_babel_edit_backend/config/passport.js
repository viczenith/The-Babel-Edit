import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../prismaClient.js';
import { generateAccessToken, generateRefreshToken } from '../utils/authUtils.js';
import { sendEmail } from '../utils/emailService.js';

// Only register GoogleStrategy if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? `${process.env.SERVER_URL}/api/auth/auth/google/callback`
      : "/api/auth/auth/google/callback",
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let isNewUser = false;

      // Check if user exists by Google ID
      let user = await prisma.user.findUnique({
        where: { googleId: profile.id }
      });

      if (!user) {
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          // Link existing account with Google ID
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              isVerified: true,
              avatar: user.avatar || profile.photos?.[0]?.value || null
            }
          });
          // Not a new user — just linked their Google account
        } else {
          // Create new user
          isNewUser = true;
          user = await prisma.user.create({
            data: {
              email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value || null,
              isVerified: true
            }
          });

          // Send welcome email (non-blocking)
          try {
            const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            const firstName = user.firstName || 'there';
            const welcomeHtml = `
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Welcome to The Babel Edit</title>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
                </head>
                <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3e8e7;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 40px 16px;">
                    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
                      <!-- Header -->
                      <div style="border-top: 4px solid #ef4444; padding: 40px 32px; text-align: center;">
                        <p style="color: #7f1d1d; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">Welcome To</p>
                        <h1 style="color: #0f172a; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.025em; font-family: 'Playfair Display', Georgia, serif;">The Babel Edit</h1>
                        <div style="width: 40px; height: 2px; background: #ef4444; margin: 14px auto 0;"></div>
                      </div>
                      <!-- Hero Section -->
                      <div style="padding: 32px 32px 24px; text-align: center;">
                        <h2 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 16px; font-family: 'Playfair Display', Georgia, serif;">Hello, ${firstName}!</h2>
                        <p style="color: #64748b; font-size: 15px; margin: 0 0 8px; line-height: 1.6;">Thank you for joining our community of style-conscious individuals.</p>
                        <p style="color: #64748b; font-size: 15px; margin: 0; line-height: 1.6;">At The Babel Edit, we curate fashion that speaks to every occasion — effortlessly.</p>
                      </div>
                      <!-- Divider -->
                      <div style="padding: 0 32px;"><div style="border-top: 1px solid #e8d9d9;"></div></div>
                      <!-- Features Grid -->
                      <div style="padding: 32px;">
                        <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #7f1d1d; margin: 0 0 24px; text-align: center; font-weight: 600;">Your Membership Benefits</p>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f1eded;">
                              <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="width: 40px; vertical-align: top;">
                                  <div style="width: 32px; height: 32px; background: #fef2f2; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">🛍️</div>
                                </td>
                                <td style="padding-left: 12px;">
                                  <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 2px;">Curated Collections</p>
                                  <p style="font-size: 13px; color: #64748b; margin: 0;">Handpicked fashion from around the world</p>
                                </td>
                              </tr></table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f1eded;">
                              <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="width: 40px; vertical-align: top;">
                                  <div style="width: 32px; height: 32px; background: #fef2f2; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">❤️</div>
                                </td>
                                <td style="padding-left: 12px;">
                                  <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 2px;">Personal Wishlist</p>
                                  <p style="font-size: 13px; color: #64748b; margin: 0;">Save pieces you love and shop when you're ready</p>
                                </td>
                              </tr></table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #f1eded;">
                              <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="width: 40px; vertical-align: top;">
                                  <div style="width: 32px; height: 32px; background: #fef2f2; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">✨</div>
                                </td>
                                <td style="padding-left: 12px;">
                                  <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 2px;">New Arrivals First</p>
                                  <p style="font-size: 13px; color: #64748b; margin: 0;">Be the first to discover our latest drops</p>
                                </td>
                              </tr></table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 16px; vertical-align: top;">
                              <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="width: 40px; vertical-align: top;">
                                  <div style="width: 32px; height: 32px; background: #fef2f2; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">🎁</div>
                                </td>
                                <td style="padding-left: 12px;">
                                  <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 2px;">Exclusive Offers</p>
                                  <p style="font-size: 13px; color: #64748b; margin: 0;">Members-only discounts and early access to sales</p>
                                </td>
                              </tr></table>
                            </td>
                          </tr>
                        </table>
                      </div>
                      <!-- CTA -->
                      <div style="padding: 8px 32px 40px; text-align: center;">
                        <a href="${frontendUrl}/en/products" style="display: inline-block; padding: 14px 44px; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; border-radius: 9999px;">Explore the Collection</a>
                        <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">Free shipping on your first order over $100</p>
                      </div>
                      <!-- Footer -->
                      <div style="border-top: 1px solid #e8d9d9; padding: 28px 32px; text-align: center;">
                        <p style="color: #7f1d1d; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px;">The Babel Edit</p>
                        <p style="margin: 0 0 12px;">
                          <a href="${frontendUrl}/en/products" style="color: #64748b; font-size: 12px; text-decoration: none; margin: 0 8px;">Shop</a>
                          <span style="color: #e8d9d9;">|</span>
                          <a href="${frontendUrl}/en/about" style="color: #64748b; font-size: 12px; text-decoration: none; margin: 0 8px;">About</a>
                          <span style="color: #e8d9d9;">|</span>
                          <a href="${frontendUrl}/en/contact" style="color: #64748b; font-size: 12px; text-decoration: none; margin: 0 8px;">Contact</a>
                        </p>
                        <div style="width: 30px; height: 1px; background: #e8d9d9; margin: 12px auto;"></div>
                        <p style="color: #64748b; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} The Babel Edit. All rights reserved.</p>
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
            // Don't fail Google auth if welcome email fails
            console.error(`❌ Welcome email error for ${email}:`, emailError.message || emailError);
          }
        }
      }

      // Generate tokens for the authenticated user
      const userAccessToken = generateAccessToken(user);
      const userRefreshToken = generateRefreshToken(user);

      // Store refresh token in database
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: userRefreshToken }
      });

      // Return user along with tokens
      const authResult = {
        user,
        accessToken: userAccessToken,
        refreshToken: userRefreshToken,
        isNewUser
      };

      return done(null, authResult);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
} else {
  console.warn('Google OAuth credentials not set; skipping GoogleStrategy registration');
}

// Since we're using session: false for stateless JWT auth,
// these serialize/deserialize functions are not needed for the OAuth flow
// But keeping them in case you want to use sessions elsewhere
passport.serializeUser((authResult, done) => {
  // Store only the user ID in the session
  done(null, authResult.user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
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
        // Don't select password or refreshToken for security
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;