import jwt from "jsonwebtoken";
import prisma from '../prismaClient.js';

export const authenticateToken = async (req, res, next) => {
  let token;

  // 1. First check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2. If no header, check cookies (fixed name)
  if (!token && req.cookies?.accessToken) {  // ✅ Changed from access_token
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  // 3. Verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      // 401 = not authenticated (token expired / invalid) — lets the client retry via refresh
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // 4. Check if user is suspended
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { isSuspended: true }
      });
      if (dbUser?.isSuspended) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      }
    } catch (dbErr) {
      // continue anyway if DB check fails — don't block on transient DB errors
    }

    req.user = user;
    next();
  });
};

// Check for specific roles
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Access denied. No role information provided.' });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // Allow passing a single role string or an array of roles
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Normalize to uppercase for comparison
    const normalizedAllowed = rolesArray.map(role => (role || '').toUpperCase());

    // Always allow SUPER_ADMIN to access admin-only routes
    if (userRole === 'SUPER_ADMIN') return next();

    if (normalizedAllowed.includes(userRole)) {
      next(); // Role is allowed, so continue
    } else {
      res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
    }
  };
};
