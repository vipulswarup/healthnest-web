import { z } from 'zod';

const email = z.email().max(254).transform(value => value.trim().toLowerCase());
const credentials = z.object({ email, password: z.string().min(8).max(128) });
const signup = credentials.extend({ name: z.string().trim().min(1).max(160) });
const schemas = {
  '/api/auth/sign-up/email': signup,
  '/api/auth/mobile/password': z.object({ email, password: z.string().min(1).max(128) }),
  '/api/auth/sign-in/email': z.object({ email, password: z.string().min(1).max(128) }),
  '/api/auth/sign-in/magic-link': z.object({ email }),
  '/api/auth/request-password-reset': z.object({ email }),
};

export type ConsumeAuthLimit = (identity: string, limit: number) => Promise<boolean>;

/** Validate a clone so the auth provider still receives its original request body. */
export async function guardAuthRequest(request: Request, consume: ConsumeAuthLimit): Promise<Response | null> {
  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  const schema = schemas[pathname as keyof typeof schemas];
  if (request.method !== 'POST' || !schema) return null;
  const reply = (error: string, status: number, extra = {}) => Response.json(
    { error, message: error }, { status, headers: { 'Cache-Control': 'no-store', ...extra } }
  );
  // Bound actual input, including requests without a Content-Length header.
  const reader = request.clone().body?.getReader();
  if (!reader) return reply('Please provide the required fields.', 400);
  let raw = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16_384) {
      void reader.cancel();
      return reply('Request is too large.', 413);
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  let body;
  try { body = JSON.parse(raw); } catch { return reply('Please provide valid form data.', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return reply('Check your email, name and password and try again.', 400);
  try {
    // One shared email budget prevents bypass by alternating reset, signup and magic-link endpoints.
    if (!await consume(`email:${parsed.data.email}`, ['/api/auth/sign-in/email', '/api/auth/mobile/password'].includes(pathname) ? 20 : 5)) {
      return reply('Too many attempts. Please try again in an hour.', 429, { 'Retry-After': '3600' });
    }
    // Trust only Vercel's overwritten client-IP header on Vercel; never arbitrary X-Forwarded-For.
    const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null;
    if (ip && !await consume(`ip:${ip}`, 50)) {
      return reply('Too many attempts. Please try again in an hour.', 429, { 'Retry-After': '3600' });
    }
  } catch {
    return reply('Sign-in is temporarily unavailable. Please try again shortly.', 503, { 'Retry-After': '60' });
  }
  return null;
}
