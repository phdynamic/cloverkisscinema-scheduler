const express = require('express');
const prisma = require('../lib/db');
const { getOAuthClient } = require('../lib/oauth');
const { getProfile } = require('../lib/atproto');
const { createSession, destroySession, ensureAdmin } = require('../lib/auth');
const { normalizeHandle, CKC_HANDLE } = require('../lib/config');

const router = express.Router();

const HANDLE_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$/;

// Start login: the browser POSTs a handle and is sent the Bluesky authorize URL.
router.post('/login', express.json(), async (req, res) => {
  try {
    const handle = normalizeHandle(req.body?.handle || '');
    if (!HANDLE_RE.test(handle)) {
      return res.status(400).json({ error: 'Enter a Bluesky handle, like name.bsky.social' });
    }
    const client = await getOAuthClient();
    const url = await client.authorize(handle, { scope: 'atproto' });
    res.json({ url: url.toString() });
  } catch (err) {
    console.error('[auth] login failed:', err.message);
    res.status(400).json({ error: 'Could not start Bluesky sign-in. Check the handle and try again.' });
  }
});

// Bluesky sends the user back here.
router.get('/callback', async (req, res) => {
  const fail = (code) => res.redirect(`/login?error=${code}`);
  try {
    if (req.query.error) return fail('cancelled');

    const client = await getOAuthClient();
    const { session } = await client.callback(new URLSearchParams(req.query));
    const did = session.did;

    // We only needed to verify identity; don't hold on to Bluesky tokens.
    session.signOut().catch(() => {});

    let user = await prisma.user.findUnique({ where: { did } });
    if (!user) {
      await ensureAdmin().catch((e) => console.error('[auth] ensureAdmin:', e.message));
      user = await prisma.user.findUnique({ where: { did } });
    }
    if (!user) return fail('not_approved');

    let profile = {};
    try {
      profile = await getProfile(did);
    } catch {
      /* keep the stored profile */
    }
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        handle: profile.handle || user.handle,
        displayName: profile.displayName ?? user.displayName,
        avatar: profile.avatar ?? user.avatar,
        lastLoginAt: new Date(),
      },
    });

    await createSession(res, user.id);
    res.redirect('/');
  } catch (err) {
    console.error('[auth] callback failed:', err.message);
    fail('failed');
  }
});

router.post('/logout', async (req, res) => {
  await destroySession(req, res);
  res.json({ success: true });
});

// Current user, for the frontend (also mounted at /api/me).
function me(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' });
  const { id, did, handle, displayName, avatar, role } = req.user;
  res.json({ user: { id, did, handle, displayName, avatar, role }, postingAs: CKC_HANDLE });
}
router.get('/me', me);
router.me = me;

module.exports = router;
