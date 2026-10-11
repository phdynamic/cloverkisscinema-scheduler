const { BskyAgent, RichText } = require('@atproto/api');
const fs = require('fs');
const path = require('path');
const { CKC_HANDLE, MAX_IMAGE_BYTES, normalizeHandle } = require('./config');

const PUBLIC_API = 'https://public.api.bsky.app/xrpc';

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// ── Public (unauthenticated) lookups ─────────────────────────────────────

async function publicGet(method, params) {
  const url = `${PUBLIC_API}/${method}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Bluesky lookup failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function resolveHandle(handle) {
  const data = await publicGet('com.atproto.identity.resolveHandle', {
    handle: normalizeHandle(handle),
  });
  return data.did;
}

async function getProfile(actor) {
  return publicGet('app.bsky.actor.getProfile', { actor });
}

// ── The Clover Kiss Cinema posting agent (credentials from env) ──────────

let agentPromise = null;

function getAgent() {
  if (!agentPromise) {
    const password = process.env.CKC_APP_PASSWORD;
    if (!password) {
      return Promise.reject(new Error('CKC_APP_PASSWORD is not set'));
    }
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    agentPromise = agent
      .login({ identifier: CKC_HANDLE, password: password.trim() })
      .then(() => agent)
      .catch((err) => {
        agentPromise = null; // retry from scratch next time
        throw err;
      });
  }
  return agentPromise;
}

function clearAgent() {
  agentPromise = null;
}

async function uploadBlob(agent, filePath) {
  const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
  if (!mimeType) throw new Error(`Unsupported image type: ${path.basename(filePath)}`);
  const bytes = fs.readFileSync(filePath);
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image ${path.basename(filePath)} is ${(bytes.length / 1e6).toFixed(1)}MB; Bluesky's limit is 1MB. Edit the post and replace it with a smaller image.`
    );
  }
  const response = await agent.uploadBlob(bytes, { encoding: mimeType });
  return response.data.blob;
}

async function postSegments(agent, threads) {
  let rootRef = null;
  let parentRef = null;

  for (const thread of threads) {
    let embed;
    if (thread.images && thread.images.length > 0) {
      const images = [];
      for (const img of [...thread.images].sort((a, b) => a.position - b.position)) {
        const blob = await uploadBlob(agent, path.resolve(img.path));
        images.push({ alt: img.altText || '', image: blob });
      }
      embed = { $type: 'app.bsky.embed.images', images };
    }

    // Detect links, mentions and hashtags so they are clickable.
    const rt = new RichText({ text: thread.text });
    await rt.detectFacets(agent);

    const record = { text: rt.text, createdAt: new Date().toISOString() };
    if (rt.facets && rt.facets.length) record.facets = rt.facets;
    if (embed) record.embed = embed;
    if (parentRef) record.reply = { root: rootRef, parent: parentRef };

    const response = await agent.post(record);
    const ref = { uri: response.uri, cid: response.cid };
    if (!rootRef) rootRef = ref;
    parentRef = ref;
  }
}

async function sendPost(post) {
  const threads = [...post.threads].sort((a, b) => a.position - b.position);
  try {
    await postSegments(await getAgent(), threads);
  } catch (err) {
    // An expired/revoked session surfaces as 401 (or ExpiredToken): log in again once.
    if (err.status === 401 || /ExpiredToken|InvalidToken/i.test(err.message || '')) {
      clearAgent();
      await postSegments(await getAgent(), threads);
      return;
    }
    throw err;
  }
}

module.exports = { resolveHandle, getProfile, getAgent, sendPost, clearAgent, uploadBlob };
