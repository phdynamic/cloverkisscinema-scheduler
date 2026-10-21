const express = require('express');
const path = require('path');
const fs = require('fs');
const { BASE_URL, UPLOAD_DIR, IS_LOCAL, IS_SECURE } = require('./lib/config');
const { loadUser, requireAuth, requireAdmin, ensureAdmin } = require('./lib/auth');
const { getOAuthClient } = require('./lib/oauth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directories exist
const dbPath = (process.env.DATABASE_URL || '').replace(/^file:/, '');
for (const dir of [UPLOAD_DIR, dbPath ? path.dirname(path.resolve(dbPath)) : null]) {
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Startup sanity checks: loud, but never fatal, so Railway logs say what's missing.
const missing = ['CKC_APP_PASSWORD', 'OAUTH_PRIVATE_KEY_JWK', 'BASE_URL'].filter((k) => !process.env[k]);
if (!process.env.ADMIN_HANDLE && !process.env.ADMIN_DID) missing.push('ADMIN_HANDLE');
if (missing.length) console.warn(`[config] Missing environment variables: ${missing.join(', ')}`);
if (!IS_SECURE && !IS_LOCAL) console.warn('[config] BASE_URL should be an https:// URL in production');

app.set('trust proxy', 1); // Railway terminates TLS in front of us
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(loadUser);

// Public: health check and OAuth client documents Bluesky fetches.
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/client-metadata.json', async (req, res) => {
  try {
    res.json((await getOAuthClient()).clientMetadata);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});
app.get('/jwks.json', async (req, res) => {
  try {
    res.json((await getOAuthClient()).jwks);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// Auth endpoints (login/callback/logout/me)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
app.get('/api/me', authRoutes.me);

// Everything below requires an approved, signed-in user.
app.use('/uploads', requireAuth, express.static(UPLOAD_DIR));
app.use('/api/posts', requireAuth, require('./routes/posts'));
app.use('/api/templates', requireAuth, require('./routes/templates'));
app.use('/api/uploads', requireAuth, require('./routes/uploads'));
app.use('/api/admin', requireAdmin, require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Frontend (public; the SPA shows the login page when /api/me says 401)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// Error handler (e.g. malformed JSON)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong' });
});

const { startScheduler } = require('./cron');
startScheduler();

app.listen(PORT, () => {
  console.log(`[server] Post Scheduler running on port ${PORT} (${BASE_URL})`);
  ensureAdmin()
    .then((did) => did && console.log('[auth] Manager account ready'))
    .catch((err) => console.warn('[auth] Could not set up manager yet (will retry at login):', err.message));
});
