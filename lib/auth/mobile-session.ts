import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db/neon';
import { BETA_ACKNOWLEDGEMENT_VERSION } from '@/lib/legal/beta-acknowledgement';

type MobileUser = { id: string; email: string; name: string; acknowledged?: boolean };

const MOBILE_SESSION_TTL_DAYS = 90;

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

// Refreshing last_used_at on every request costs a write round-trip; hourly is plenty.
const LAST_USED_REFRESH_MS = 60 * 60 * 1000;

/**
 * Resolves a mobile bearer token with one database round-trip: the session,
 * the profile and the current beta acknowledgement are joined together.
 */
export async function getUserFromMobileToken(token: string): Promise<MobileUser | null> {
  const tokenHash = hashToken(token);
  const [row] = await sql`
    SELECT s.last_used_at, p.user_id, p.email, p.first_name, p.last_name,
      EXISTS (
        SELECT 1 FROM beta_acknowledgements b
        WHERE b.user_id = p.user_id AND b.acknowledgement_version = ${BETA_ACKNOWLEDGEMENT_VERSION}
      ) AS acknowledged
    FROM mobile_sessions s
    INNER JOIN profiles p ON p.user_id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1
  `;
  if (!row) return null;

  const lastUsed = row.last_used_at ? new Date(String(row.last_used_at)).getTime() : 0;
  if (Date.now() - lastUsed > LAST_USED_REFRESH_MS) {
    await sql`UPDATE mobile_sessions SET last_used_at = NOW() WHERE token_hash = ${tokenHash}`;
  }

  const email = row.email ? String(row.email) : '';
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || email || 'User';
  return { id: String(row.user_id), email, name, acknowledged: Boolean(row.acknowledged) };
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
