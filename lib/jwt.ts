/**
 * Server-only JWT minting for the Omnia node.
 *
 * The node verifies `Authorization: Bearer <token>` using HS256 with the
 * secret in OMNIA_JWT_SECRET. This module reproduces the same signing
 * logic as the Rust `create_token(caller_id, ttl_secs)` function in
 * node/src/api/auth.rs so tokens issued here are accepted by the node.
 *
 * This runs ONLY on the server (Next.js API routes / server actions).
 * The secret must never be exposed to the browser.
 */

interface JwtClaims {
  sub: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url').replace(/=+$/, '');
}

async function signHs256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64url(Buffer.from(sig));
}

/**
 * Mint a signed HS256 JWT for the given caller identity.
 *
 * @param callerId - The DID to embed as the JWT `sub` claim
 * @param ttlSeconds - Token lifetime in seconds (default: 24 hours)
 * @returns The signed JWT string
 * @throws If OMNIA_JWT_SECRET is not set
 */
export async function mintNodeJwt(callerId: string, ttlSeconds: number = 86400): Promise<string> {
  const secret = process.env.OMNIA_JWT_SECRET;
  if (!secret) {
    throw new Error('OMNIA_JWT_SECRET is not set. Cannot mint node JWT.');
  }

  const now = Math.floor(Date.now() / 1000);
  const claims: JwtClaims = {
    sub: callerId,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;
  const signature = await signHs256(signingInput, secret);

  return `${signingInput}.${signature}`;
}
