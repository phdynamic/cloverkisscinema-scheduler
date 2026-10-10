const express = require('express');
const prisma = require('../lib/db');
const { resolveHandle, getProfile } = require('../lib/atproto');
const { normalizeHandle, ADMIN_DID } = require('../lib/config');

const router = express.Router();

// List everyone who is approved to log in.
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        did: true,
        handle: true,
        displayName: true,
        avatar: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { submitted: true } },
      },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve someone by Bluesky handle.
router.post('/users', async (req, res) => {
  try {
    const handle = normalizeHandle(req.body?.handle || '');
    if (!handle) return res.status(400).json({ error: 'A Bluesky handle is required' });

    let did;
    try {
      did = await resolveHandle(handle);
    } catch {
      return res.status(400).json({ error: `Couldn't find a Bluesky account for @${handle}` });
    }
    if (await prisma.user.findUnique({ where: { did } })) {
      return res.status(409).json({ error: `@${handle} is already approved` });
    }

    let profile = {};
    try {
      profile = await getProfile(did);
    } catch {
      /* refreshed at first login */
    }
    const user = await prisma.user.create({
      data: {
        did,
        handle: profile.handle || handle,
        displayName: profile.displayName || null,
        avatar: profile.avatar || null,
        role: 'member',
      },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Revoke access. Their sessions are deleted; their posts stay.
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: "You can't remove yourself" });
    if (target.role === 'admin' || target.did === ADMIN_DID) {
      return res.status(400).json({ error: "The manager can't be removed" });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
