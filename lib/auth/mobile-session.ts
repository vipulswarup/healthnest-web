import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db/neon';

type MobileUser = { id: string; email: string; name: string };

const MOBILE_SESSION_TTL_DAYS = 180;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) return null;
  return token.trim();
}

export async function createMobileSession(userId: string, label?: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MOBILE_SESSION_TTL_DAYS);
  await sql`
    INSERT INTO mobile_sessions (user_id, token_hash, device_label, expires_at)
    VALUES (${userId}, ${hashToken(token)}, ${label || null}, ${expiresAt.toISOString()}::timestamptz)
  `;
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function getUserFromMobileToken(token: string): Promise<MobileUser | null> {
  const [row] = await sql`
    UPDATE mobile_sessions
    SET last_used_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id
  `;
  if (!row) return null;

  const [profile] = await sql`
    SELECT user_id, email, first_name, last_name
    FROM profiles
    WHERE user_id = ${String(row.user_id)}
    LIMIT 1
  `;
  if (!profile) return null;

  const email = profile.email ? String(profile.email) : '';
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || email || 'User';
  return { id: String(profile.user_id), email, name };
}

export async function revokeMobileToken(token: string, userId: string) {
  await sql`
    UPDATE mobile_sessions
    SET revoked_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND user_id = ${userId}
      AND revoked_at IS NULL
  `;
}
