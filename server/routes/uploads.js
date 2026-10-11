const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { UPLOAD_DIR, MAX_IMAGE_BYTES } = require('../lib/config');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomUUID() + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  // Bluesky's per-image limit (inclusive); it does not resize for us. multer errors once a
  // file *reaches* the limit, hence +1 so that exactly MAX_IMAGE_BYTES is still accepted.
  limits: { fileSize: MAX_IMAGE_BYTES + 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// Upload images (max 4)
router.post('/', (req, res) => {
  upload.array('images', 4)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: "That image is over Bluesky's 1MB limit. Photos are shrunk automatically in the browser; GIFs must already be under 1MB." });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum 4 images per upload.' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map((f) => ({
      path: path.join(UPLOAD_DIR, f.filename),
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
    }));
    res.status(201).json(files);
  });
});

// Delete file (manager only: uploads aren't tracked per user)
router.delete('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Manager access only' });
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    // Security: ensure the path is within UPLOAD_DIR
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
