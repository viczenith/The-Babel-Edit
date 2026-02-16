import crypto from 'crypto';
import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import { appendAuditLog } from './adminController.js';

// Helper to require primary super admin
const ensurePrimary = async (req) => {
  const u = req.user;
  const userId = u && (typeof u === 'string' ? u : (u.userId || u.id || u.sub));
  if (!userId) throw { status: 403, message: 'User not authenticated' };

  // Fetch full user record to avoid Prisma select mismatch across generated clients
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 403, message: 'User not found' };
  if ((user.role || '').toUpperCase() !== 'SUPER_ADMIN' || !user.isPrimary) throw { status: 403, message: 'Only primary SUPER_ADMIN allowed' };
  return user;
};

export const createToken = async (req, res) => {
  try {
    await ensurePrimary(req);

    const { expiresInHours = 24, purpose } = req.body;

    // Generate a secure token and a hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 12);

    const expiresAt = new Date(Date.now() + (parseInt(expiresInHours) || 24) * 60 * 60 * 1000);

    const record = await prisma.superAdminToken.create({
      data: {
        tokenHash,
        createdBy: req.user.userId,
        expiresAt,
        purpose: purpose || null
      }
    });

    await appendAuditLog({ action: 'create_superadmin_token', resource: 'SuperAdminToken', resourceId: record.id, details: { id: record.id, purpose }, severity: 'critical', user: { id: req.user.userId, email: req.user.email, role: req.user.role }, req });

    // Return the raw token only once (caller should show/copy it)
    res.status(201).json({ id: record.id, token, expiresAt });
  } catch (err) {
    console.error('Create token error', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create token' });
  }
};

export const listTokens = async (req, res) => {
  try {
    await ensurePrimary(req);

    const tokens = await prisma.superAdminToken.findMany({
      where: {},
      select: { id: true, createdBy: true, createdAt: true, expiresAt: true, usedAt: true, revoked: true, purpose: true }
    });

    res.json({ tokens });
  } catch (err) {
    console.error('List tokens error', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to list tokens' });
  }
};

export const revokeToken = async (req, res) => {
  try {
    await ensurePrimary(req);
    const { id } = req.params;
    const updated = await prisma.superAdminToken.update({ where: { id }, data: { revoked: true } });

    await appendAuditLog({ action: 'revoke_superadmin_token', resource: 'SuperAdminToken', resourceId: id, details: { id }, severity: 'critical', user: { id: req.user.userId, email: req.user.email, role: req.user.role }, req });

    res.json({ message: 'Token revoked', id: updated.id });
  } catch (err) {
    console.error('Revoke token error', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to revoke token' });
  }
};

// Used internally by register: validate token and mark used
export const validateAndConsumeToken = async (rawToken, userIdToConsume = null) => {
  if (!rawToken) return null;
  // Find candidate tokens (not revoked, not used, not expired)
  const candidates = await prisma.superAdminToken.findMany({ where: { revoked: false, usedAt: null, expiresAt: { gt: new Date() } } });
  for (const c of candidates) {
    const match = await bcrypt.compare(rawToken, c.tokenHash);
    if (match) {
      // consume
      const updated = await prisma.superAdminToken.update({ where: { id: c.id }, data: { usedAt: new Date(), usedBy: userIdToConsume || null } });
      await appendAuditLog({ action: 'redeem_superadmin_token', resource: 'SuperAdminToken', resourceId: c.id, details: { id: c.id, usedBy: userIdToConsume }, severity: 'critical', user: { id: userIdToConsume || null } });
      return updated;
    }
  }
  return null;
};
