const prisma = require('./db');
const { getAgent, clearAgent } = require('./atproto');
const { BASE_URL, CKC_HANDLE } = require('./config');

// Direct messages go through Bluesky's chat service, reached via the account's own PDS.
const CHAT_DID = 'did:web:api.bsky.chat';

async function sendDm(recipientDid, text) {
  const agent = (await getAgent()).withProxy('bsky_chat', CHAT_DID);
  const chat = agent.api.chat.bsky.convo;
  const { data } = await chat.getConvoForMembers({ members: [recipientDid] });
  await chat.sendMessage({ convoId: data.convo.id, message: { text } });
}

// Tell the manager a post is waiting for approval. Best effort: a failed DM is logged
// and never blocks the submission. Needs an app password with DM access.
async function notifyPendingPost(post) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { did: true } });
    const who = post.submittedByHandle ? `@${post.submittedByHandle}` : 'Someone';
    const preview = (post.threads?.[0]?.text || '(image only)').slice(0, 120);
    const text = `${who} submitted a post for approval:\n\n“${preview}”\n\n${BASE_URL}/?tab=pending`;
    for (const { did } of admins) {
      if (did.startsWith('did:dev:')) continue; // local dev bypass user
      try {
        await sendDm(did, text);
      } catch (err) {
        clearAgent();
        await sendDm(did, text); // one retry with a fresh login
      }
    }
  } catch (err) {
    console.error(`Could not DM the manager from @${CKC_HANDLE}:`, err.message);
  }
}

module.exports = { notifyPendingPost };
