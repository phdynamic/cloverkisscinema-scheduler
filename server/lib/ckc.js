const prisma = require('./db');
const { CKC_HANDLE } = require('./config');
const { resolveHandle } = require('./atproto');

let cachedId = null;

// The one posting account. Created on first use; the app password is never
// stored here (it comes from CKC_APP_PASSWORD).
async function getCkcAccount() {
  if (cachedId) return prisma.account.findUnique({ where: { id: cachedId } });

  let account = await prisma.account.findUnique({ where: { handle: CKC_HANDLE } });
  if (!account) {
    const did = await resolveHandle(CKC_HANDLE);
    account = await prisma.account.upsert({
      where: { did },
      update: { handle: CKC_HANDLE },
      create: { label: 'Clover Kiss Cinema', handle: CKC_HANDLE, did, appPassword: '(env)' },
    });
  } else if (account.appPassword !== '(env)') {
    // Scrub any app password saved by the old multi-account version.
    account = await prisma.account.update({
      where: { id: account.id },
      data: { appPassword: '(env)', label: 'Clover Kiss Cinema' },
    });
  }
  cachedId = account.id;
  return account;
}

module.exports = { getCkcAccount };
