import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export type AppleIdentity = {
  sub: string;
  email: string | null;
};

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const audience = (process.env.APPLE_BUNDLE_ID || 'com.sanovault.app').trim();
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: APPLE_ISSUER,
    audience,
  });
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) throw new Error('Apple token is missing a subject');
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  const email = emailVerified && typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  return { sub, email };
}

export function appleRevocationConfigured() {
  return Boolean(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

async function appleClientSecret() {
  if (!appleRevocationConfigured()) throw new Error('Apple revocation is not configured');
  const key = await importPKCS8(process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_TEAM_ID!).setSubject(process.env.APPLE_BUNDLE_ID || 'com.sanovault.app')
    .setAudience(APPLE_ISSUER).setIssuedAt().setExpirationTime('5m').sign(key);
}

export async function exchangeAppleCode(code: string, expectedSubject: string) {
  const response = await fetch(`${APPLE_ISSUER}/auth/token`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({ client_id: process.env.APPLE_BUNDLE_ID || 'com.sanovault.app',
      client_secret: await appleClientSecret(), code, grant_type: 'authorization_code' }),
  });
  if (!response.ok) throw new Error('Apple authorization could not be verified');
  const data = await response.json();
  const identity = await verifyAppleIdentityToken(data.id_token);
  if (identity.sub !== expectedSubject || typeof data.refresh_token !== 'string') throw new Error('Apple identity mismatch');
  return data.refresh_token as string;
}

export async function revokeAppleToken(token: string) {
  const response = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({ client_id: process.env.APPLE_BUNDLE_ID || 'com.sanovault.app',
      client_secret: await appleClientSecret(), token, token_type_hint: 'refresh_token' }),
  });
  if (!response.ok) throw new Error('Apple revocation failed');
}
