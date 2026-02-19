import jwt from 'jsonwebtoken';

// Generate short-lived access token
export const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      role: user.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );
};

// Generate long-lived refresh token
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' }
  );
};

// Set refresh token as httpOnly cookie
export const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    // In production, frontend (Vercel) and backend (Render) are on different domains,
    // so we must use 'none' to allow cross-origin cookie sending.
    // 'strict' blocks the cookie from being sent cross-origin, breaking token refresh.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
