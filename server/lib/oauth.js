const { NodeOAuthClient, requestLocalLock } = require('@atproto/oauth-client-node');
const { JoseKey } = require('@atproto/jwk-jose');
const prisma = require('./db');
const { BASE_URL } = require('./config');

// Persist OAuth state/session as JSON strings in SQLite.
function prismaStore(model, { expireMs } = {}) {
  return {
    async get(key) {
      const row = await model.findUnique({ where: { key } });
      return row ? JSON.parse(row.value) : undefined;
    },
    async set(key, value) {
      const data = { value: JSON.stringify(value) };
      await model.upsert({ where: { key }, update: data, create: { key, ...data } });
      if (expireMs) {
        await model.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - expireMs) } } });
      }
    },
    async del(key) {
      await model.deleteMany({ where: { key } });
    },
  };
}

let clientPromise = null;

function loadPrivateJwk() {
  const raw = process.env.OAUTH_PRIVATE_KEY_JWK;
  if (!raw) throw new Error('OAUTH_PRIVATE_KEY_JWK is not set (run: node scripts/generate-oauth-key.js)');
  const jwk = JSON.parse(raw);
  return { ...jwk, kid: jwk.kid || 'ckc-1', alg: jwk.alg || 'ES256' };
}

async function build() {
  const key = await JoseKey.fromImportable(loadPrivateJwk(), loadPrivateJwk().kid);
  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${BASE_URL}/client-metadata.json`,
      client_name: 'Clover Kiss Cinema Projection Booth',
      client_uri: BASE_URL,
      redirect_uris: [`${BASE_URL}/auth/callback`],
      scope: 'atproto',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: `${BASE_URL}/jwks.json`,
    },
    keyset: [key],
    stateStore: prismaStore(prisma.oAuthState, { expireMs: 60 * 60 * 1000 }),
    sessionStore: prismaStore(prisma.oAuthSession),
    requestLock: requestLocalLock,
  });
}

function getOAuthClient() {
  if (!clientPromise) {
    clientPromise = build().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

module.exports = { getOAuthClient };
