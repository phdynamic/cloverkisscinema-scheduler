const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directories exist
const dbDir = '/data/db';
const uploadDir = process.env.UPLOAD_DIR || '/data/uploads';
for (const dir of [dbDir, uploadDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Basic auth (optional — only if env vars are set)
if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
  const basicAuth = require('express-basic-auth');
  const authUser = process.env.BASIC_AUTH_USER.trim();
  const authPass = process.env.BASIC_AUTH_PASS.trim();
  app.use(
    basicAuth({
      users: { [authUser]: authPass },
      challenge: true,
      realm: 'SkyQueue',
      unauthorizedResponse: () => 'Unauthorized — check BASIC_AUTH_USER and BASIC_AUTH_PASS',
    })
  );
  console.log(`[auth] Basic auth enabled for user: "${authUser}"`);
}

// Middleware
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/uploads', require('./routes/uploads'));

// Serve frontend
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start cron scheduler
const { startScheduler } = require('./cron');
startScheduler();

app.listen(PORT, () => {
  console.log(`[server] SkyQueue running on port ${PORT}`);
});
