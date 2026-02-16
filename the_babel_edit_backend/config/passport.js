import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../prismaClient.js';
import { generateAccessToken, generateRefreshToken } from '../utils/authUtils.js';

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
          // Update existing user with Google ID
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              isVerified: true,
              avatar: profile.photos?.[0]?.value || null
            }
          });
        } else {
          // Create new user
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
        refreshToken: userRefreshToken
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