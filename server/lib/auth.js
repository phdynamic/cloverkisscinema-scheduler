const crypto = require('crypto');
const prisma = require('./db');
const { IS_SECURE, IS_LOCAL, SESSION_DAYS, ADMIN_HANDLE, ADMIN_DID } = require('./config');
const { resolveHandle, getProfile } = require('./atproto');

const COOKIE = 'ckc_sid';

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function cookieOptions() {
  return { httpOnly: true, secure: IS_SECURE, sameSite: 'lax', path: '/' };
}

async function createSession(res, userId) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  res.cookie(COOKIE, id, { ...cookieOptions(), expires: expiresAt });
  // Opportunistic cleanup of expired sessions.
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}

async function destroySession(req, res) {
  const id = readCookie(req, COOKIE);
  if (id) await prisma.session.deleteMany({ where: { id } });
  res.clearCookie(COOKIE, cookieOptions());
}

// Local development only: DEV_BYPASS_ROLE=admin|member skips OAuth. Ignored
// unless BASE_URL is http://localhost..., so it can never be live in production.
async function devBypassUser() {
  const role = process.env.DEV_BYPASS_ROLE;
  if (!IS_LOCAL || !['admin', 'member'].includes(role)) return null;
  const did = `did:dev:${role}`;
  return prisma.user.upsert({
    where: { did },
    update: {},
    create: { did, handle: `dev-${role}.test`, displayName: `Dev ${role}`, role },
  });
}

async function loadUser(req, res, next) {
  try {
    const id = readCookie(req, COOKIE);
    if (id) {
      const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
      if (session && session.expiresAt > new Date()) {
        req.user = session.user;
        return next();
      }
    }
    req.user = await devBypassUser();
    next();
  } catch (err) {
    next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Manager access only' });
  next();
}

// Make sure the owner (ADMIN_HANDLE / ADMIN_DID) exists as an admin user.
// Returns the admin's DID, or null if it can't be determined.
let adminDidCache = ADMIN_DID;
async function ensureAdmin() {
  if (!adminDidCache && ADMIN_HANDLE) adminDidCache = await resolveHandle(ADMIN_HANDLE);
  if (!adminDidCache) return null;

  const existing = await prisma.user.findUnique({ where: { did: adminDidCache } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    }
    return adminDidCache;
  }
  let handle = ADMIN_HANDLE || adminDidCache;
  let displayName = null;
  let avatar = null;
  try {
    const profile = await getProfile(adminDidCache);
    handle = profile.handle;
    displayName = profile.displayName || null;
    avatar = profile.avatar || null;
  } catch {
    /* profile is refreshed at login anyway */
  }
  await prisma.user.create({
    data: { did: adminDidCache, handle, displayName, avatar, role: 'admin' },
  });
  return adminDidCache;
}

module.exports = {
  loadUser,
  requireAuth,
  requireAdmin,
  createSession,
  destroySession,
  ensureAdmin,
};
