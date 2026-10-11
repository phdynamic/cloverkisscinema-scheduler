const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR, MAX_IMAGE_BYTES } = require('./config');

const MAX_SEGMENTS = 1; // single posts only; multi-post threads are not supported
const MAX_CHARS = 300;
const MAX_IMAGES = 4;
const MAX_ALT = 2000;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function graphemeLength(text) {
  return [...new Intl.Segmenter().segment(text)].length;
}

function bad(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// Validate and normalise a thread payload. `strict` (used when a post is
// being submitted or scheduled) additionally requires every segment to have
// text or an image. Drafts may be incomplete.
function normalizeThreads(threads, { strict }) {
  if (!Array.isArray(threads) || threads.length === 0) throw bad('At least one post is required');
  if (threads.length > MAX_SEGMENTS) throw bad('Multi-post threads are not supported; each post is a single post');

  return threads.map((t, i) => {
    const text = typeof t.text === 'string' ? t.text : '';
    const n = i + 1;
    if (graphemeLength(text) > MAX_CHARS) throw bad(`Post ${n} is over ${MAX_CHARS} characters`);

    const rawImages = Array.isArray(t.images) ? t.images : [];
    if (rawImages.length > MAX_IMAGES) throw bad(`Post ${n} has more than ${MAX_IMAGES} images`);

    const images = rawImages.map((img, j) => {
      const resolved = path.resolve(String(img.path || ''));
      // Only files inside the upload directory may ever be sent to Bluesky.
      if (!resolved.startsWith(UPLOAD_DIR + path.sep)) throw bad(`Post ${n}: invalid image`);
      if (!IMAGE_EXTS.has(path.extname(resolved).toLowerCase())) throw bad(`Post ${n}: invalid image type`);
      if (!fs.existsSync(resolved)) throw bad(`Post ${n}: an image is missing, please re-upload it`);
      if (fs.statSync(resolved).size > MAX_IMAGE_BYTES) {
        throw bad(`Post ${n}: an image is over Bluesky's 1MB limit, please remove it and add a smaller one`);
      }
      const altText = typeof img.altText === 'string' ? img.altText : '';
      if (graphemeLength(altText) > MAX_ALT) throw bad(`Post ${n}: alt text is too long`);
      return { path: resolved, altText, position: j };
    });

    if (strict && !text.trim() && images.length === 0) throw bad(`Post ${n} is empty`);
    return { position: i, text, images };
  });
}

function parseDate(value, label) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw bad(`${label} is not a valid date`);
  return d;
}

module.exports = { normalizeThreads, parseDate, bad };
