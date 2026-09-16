import { createRemoteJWKSet, jwtVerify } from 'jose';

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
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  return { sub, email };
}
