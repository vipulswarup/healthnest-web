import { createNeonAuth } from '@neondatabase/auth/next/server';

function requiredEnvironment(name: 'NEON_AUTH_BASE_URL' | 'NEON_AUTH_COOKIE_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured.`);
  }
  return value;
}

export const auth = createNeonAuth({
  baseUrl: requiredEnvironment('NEON_AUTH_BASE_URL'),
  cookies: {
    secret: requiredEnvironment('NEON_AUTH_COOKIE_SECRET'),
    // OAuth returns via a cross-site top-level navigation. Strict cookies are
    // dropped on that hop, so the session challenge never completes.
    sameSite: 'lax',
    // Share auth cookies across apex and www in production.
    ...(process.env.VERCEL_ENV === 'production' ? { domain: '.sanovault.com' } : {}),
  },
});
