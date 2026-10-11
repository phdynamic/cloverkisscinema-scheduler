const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

module.exports = {
  BASE_URL,
  IS_SECURE: BASE_URL.startsWith('https://'),
  IS_LOCAL: BASE_URL.startsWith('http://localhost'),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || '/data/uploads'),
  // Bluesky rejects image blobs over 1,000,000 bytes (app.bsky.embed.images lexicon).
  MAX_IMAGE_BYTES: 1000000,
  SESSION_DAYS: 14,
  CKC_HANDLE: normalizeHandle(process.env.CKC_HANDLE || 'cloverkisscinema.club'),
  ADMIN_HANDLE: process.env.ADMIN_HANDLE ? normalizeHandle(process.env.ADMIN_HANDLE) : null,
  ADMIN_DID: (process.env.ADMIN_DID || '').trim() || null,
};

function normalizeHandle(handle) {
  return String(handle).trim().replace(/^@/, '').toLowerCase();
}

module.exports.normalizeHandle = normalizeHandle;
