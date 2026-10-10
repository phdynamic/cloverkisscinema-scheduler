// Generates the signing key Bluesky OAuth uses to identify this app.
// Run once:  node scripts/generate-oauth-key.js
// Then copy the single line of output into a Railway variable named
// OAUTH_PRIVATE_KEY_JWK. Keep it secret; never commit it.
const crypto = require('crypto');

const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = privateKey.export({ format: 'jwk' });
jwk.kid = 'ckc-' + new Date().toISOString().slice(0, 10);
jwk.alg = 'ES256';

console.log(JSON.stringify(jwk));
