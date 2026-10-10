const cron = require('node-cron');
const prisma = require('./lib/db');
const { sendPost } = require('./lib/atproto');

let running = false;

// Only posts the manager has approved (status "scheduled") are ever sent.
// Posts awaiting approval, drafts and rejected posts are never touched.
async function sendDuePosts() {
  const duePosts = await prisma.post.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    include: { threads: { include: { images: true }, orderBy: { position: 'asc' } } },
    orderBy: { scheduledAt: 'asc' },
  });

  if (duePosts.length > 0) console.log(`[cron] Found ${duePosts.length} due post(s)`);

  for (const post of duePosts) {
    try {
      await sendPost(post);
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'sent', sentAt: new Date(), errorMsg: null },
      });
      console.log(`[cron] Post ${post.id} sent successfully`);
    } catch (err) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', errorMsg: err.message },
      });
      console.error(`[cron] Post ${post.id} failed: ${err.message}`);
    }
  }
}

function startScheduler() {
  console.log('[cron] Post scheduler started — checking every minute');

  cron.schedule('* * * * *', async () => {
    // A slow send (big images, many segments) must not overlap the next tick,
    // or the same post could be sent twice.
    if (running) return;
    running = true;
    try {
      await sendDuePosts();
    } catch (err) {
      console.error('[cron] Scheduler error:', err.message);
    } finally {
      running = false;
    }
  });
}

module.exports = { startScheduler };
