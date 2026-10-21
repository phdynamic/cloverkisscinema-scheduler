const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');
const { getCkcAccount } = require('../lib/ckc');
const { normalizeThreads, parseDate, bad } = require('../lib/validate');
const { notifyPendingPost } = require('../lib/notify');

const STATUSES = ['draft', 'pending', 'scheduled', 'sent', 'failed', 'rejected'];

const postInclude = {
  threads: { include: { images: { orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' } },
  account: { select: { id: true, label: true, handle: true } },
  submittedBy: { select: { id: true, handle: true, displayName: true } },
  reviewedBy: { select: { id: true, handle: true, displayName: true } },
};

const isAdmin = (req) => req.user.role === 'admin';

// Author/approver details are copied onto the post so credit survives if the
// person is later removed from the approved-users list (or changes their handle).
const authorFields = (u) => ({
  submittedById: u.id,
  submittedByDid: u.did,
  submittedByHandle: u.handle,
  submittedByName: u.displayName,
});
const reviewerFields = (u) => ({
  reviewedById: u.id,
  reviewedByDid: u.did,
  reviewedByHandle: u.handle,
  reviewedByName: u.displayName,
  reviewedAt: new Date(),
});
const clearReview = {
  reviewedById: null,
  reviewedByDid: null,
  reviewedByHandle: null,
  reviewedByName: null,
  reviewedAt: null,
  reviewNote: null,
};

// Members only ever see their own posts.
function visibleTo(req) {
  return isAdmin(req) ? {} : { submittedById: req.user.id };
}

async function loadPost(req, res) {
  const id = parseInt(req.params.id, 10);
  const post = Number.isInteger(id)
    ? await prisma.post.findFirst({ where: { id, ...visibleTo(req) }, include: postInclude })
    : null;
  if (!post) res.status(404).json({ error: 'Post not found' });
  return post;
}

function threadCreate(threads) {
  return {
    create: threads.map((t) => ({
      position: t.position,
      text: t.text,
      images: t.images.length ? { create: t.images } : undefined,
    })),
  };
}

// What status/schedule a save results in, given who is saving and what they asked for.
function resolveStatus(req, requested, scheduledAt, existing) {
  if (isAdmin(req)) {
    const status = requested || existing?.status || 'draft';
    if (!STATUSES.includes(status)) throw bad('Unknown status');
    if (status === 'scheduled' && !scheduledAt) throw bad('Pick a date and time to schedule');
    return status;
  }
  // Members: draft, or submit for approval. They can never schedule directly, never
  // choose a time (the manager assigns one, or posts now), and any change to an
  // already-approved post sends it back for re-approval.
  if (requested === 'draft') return 'draft';
  return 'pending';
}

// Only the manager decides when a post goes out. `postNow` means "right now" using the
// server's clock (the sender runs on it), not the browser's.
const wantsNow = (req) => isAdmin(req) && req.body?.postNow === true;

function resolveSchedule(req, existing) {
  if (!isAdmin(req)) return null; // crew-supplied times are ignored
  if (wantsNow(req)) return new Date();
  if (req.body.scheduledAt !== undefined) {
    return req.body.scheduledAt ? parseDate(req.body.scheduledAt, 'Schedule') : null;
  }
  return existing ? existing.scheduledAt : null;
}

// Everyone who has authored a post (manager only), for the "by" filter.
router.get('/authors', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Manager access only' });
    const rows = await prisma.post.findMany({
      where: { submittedByDid: { not: null } },
      distinct: ['submittedByDid'],
      orderBy: { createdAt: 'desc' }, // newest post = most recent handle/name
      select: { submittedByDid: true, submittedByHandle: true, submittedByName: true },
    });
    res.json(rows.map((r) => ({ did: r.submittedByDid, handle: r.submittedByHandle, name: r.submittedByName })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Counts per status, for tab badges.
router.get('/counts', async (req, res) => {
  try {
    const where = { ...visibleTo(req) };
    if (req.query.by && isAdmin(req)) where.submittedByDid = String(req.query.by);
    const rows = await prisma.post.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    res.json(Object.fromEntries(rows.map((r) => [r.status, r._count._all])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, from, to, by } = req.query;
    const where = { ...visibleTo(req) };
    if (by && isAdmin(req)) where.submittedByDid = String(by);
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' });
      where.status = status;
    }
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = parseDate(from, 'from');
      if (to) where.scheduledAt.lte = parseDate(to, 'to');
    }
    const posts = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(posts);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await loadPost(req, res);
    if (post) res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const scheduledAt = resolveSchedule(req, null);
    const status = resolveStatus(req, wantsNow(req) ? 'scheduled' : req.body.status, scheduledAt, null);
    const threads = normalizeThreads(req.body.threads, { strict: status !== 'draft' });
    const account = await getCkcAccount();

    const post = await prisma.post.create({
      data: {
        accountId: account.id,
        status,
        scheduledAt,
        ...authorFields(req.user),
        // A post the manager schedules directly counts as approved by them.
        ...(status === 'scheduled' ? reviewerFields(req.user) : {}),
        threads: threadCreate(threads),
      },
      include: postInclude,
    });
    res.status(201).json(post);
    if (status === 'pending') notifyPendingPost(post); // not for drafts
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await loadPost(req, res);
    if (!existing) return;

    if (existing.status === 'sent') throw bad("This post has already been posted and can't be edited");
    if (!isAdmin(req) && existing.status === 'failed') throw bad('Only the manager can retry a failed post');

    const scheduledAt = resolveSchedule(req, existing);

    // Members editing an approved post must re-submit it, so default to "pending".
    const requested = wantsNow(req) ? 'scheduled' : req.body.status ?? (isAdmin(req) ? undefined : 'pending');
    const status = resolveStatus(req, requested, scheduledAt, existing);
    const threads = req.body.threads
      ? normalizeThreads(req.body.threads, { strict: status !== 'draft' })
      : null;

    const data = { status, scheduledAt };
    // Moving a post back into review/draft clears the previous verdict.
    if (['pending', 'draft'].includes(status)) Object.assign(data, clearReview);
    if (status === 'scheduled' && existing.status !== 'scheduled') {
      data.errorMsg = null;
      Object.assign(data, reviewerFields(req.user), { reviewNote: null });
    }
    if (threads) data.threads = threadCreate(threads);

    await prisma.$transaction(async (tx) => {
      if (threads) await tx.thread.deleteMany({ where: { postId: existing.id } });
      await tx.post.update({ where: { id: existing.id }, data });
    });

    const saved = await prisma.post.findUnique({ where: { id: existing.id }, include: postInclude });
    res.json(saved);
    // Only when it newly lands in the review queue (not for edits to one already waiting).
    if (!isAdmin(req) && status === 'pending' && existing.status !== 'pending') notifyPendingPost(saved);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Manager approves a pending post: post now, or assign a time. (A time requested by an
// older, pre-change submission is used if neither is given.)
router.post('/:id/approve', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Manager access only' });
    const post = await loadPost(req, res);
    if (!post) return;
    if (post.status !== 'pending') throw bad('Only posts awaiting approval can be approved');

    const chosen = req.body?.scheduledAt;
    const scheduledAt = wantsNow(req)
      ? new Date()
      : chosen
        ? parseDate(chosen, 'Schedule')
        : post.scheduledAt;
    if (!scheduledAt) throw bad('Pick a time, or choose Post now');
    if (!wantsNow(req) && !chosen && scheduledAt < new Date(Date.now() - 60 * 1000)) {
      return res.status(409).json({
        error: 'The time they requested has already passed. Pick a new time or post now.',
        code: 'PAST_TIME',
      });
    }

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'scheduled',
        scheduledAt,
        ...reviewerFields(req.user),
        reviewNote: null,
      },
      include: postInclude,
    });
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Manager sends a pending post back with a note.
router.post('/:id/reject', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Manager access only' });
    const post = await loadPost(req, res);
    if (!post) return;
    if (post.status !== 'pending') throw bad('Only posts awaiting approval can be sent back');

    const note = String(req.body?.note || '').trim();
    if (!note) throw bad('Add a note so the author knows what to change');
    if (note.length > 500) throw bad('Keep the note under 500 characters');

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'rejected',
        reviewNote: note,
        ...reviewerFields(req.user),
      },
      include: postInclude,
    });
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const post = await loadPost(req, res);
    if (!post) return;
    if (!isAdmin(req) && !['draft', 'pending', 'rejected'].includes(post.status)) {
      throw bad("Approved posts can only be removed by the manager");
    }
    await prisma.post.delete({ where: { id: post.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
