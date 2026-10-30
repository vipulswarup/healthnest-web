import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db/neon';
import { BETA_ACKNOWLEDGEMENT_VERSION } from '@/lib/legal/beta-acknowledgement';

export type ApiTokenUser = { id: string; email: string; name: string; acknowledged?: boolean; scopes: string[] };

const LAST_USED_REFRESH_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function parseApiToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!token?.trim()) return null;
  const lower = scheme?.toLowerCase();
  if (lower === 'bearer' && token.startsWith('sv_')) return token.trim();
  if (lower === 'token') return token.trim();
  return null;
}

export async function createApiToken(userId: string, name: string) {
  const raw = `sv_${randomBytes(24).toString('base64url')}`;
  const prefix = raw.slice(0, 10);
  const [row] = await sql`
    INSERT INTO api_tokens (user_id, name, token_prefix, token_hash, scopes)
    VALUES (
      ${userId},
      ${name.trim() || 'API token'},
      ${prefix},
      ${hashToken(raw)},
      ARRAY['read','write']::TEXT[]
    )
    RETURNING id, name, token_prefix, scopes, created_at, expires_at
  `;
  return {
    id: String(row.id),
    name: String(row.name),
    tokenPrefix: String(row.token_prefix),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : ['read', 'write'],
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    token: raw,
  };
}

export async function listApiTokens(userId: string) {
  const rows = await sql`
    SELECT id, name, token_prefix, scopes, last_used_at, created_at, expires_at, revoked_at
    FROM api_tokens
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    tokenPrefix: String(row.token_prefix),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
  }));
}

export async function revokeApiToken(userId: string, tokenId: string) {
  const [row] = await sql`
    UPDATE api_tokens
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE id = ${tokenId}::uuid AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `;
  return Boolean(row);
}

export async function getUserFromApiToken(token: string): Promise<ApiTokenUser | null> {
  if (!token.startsWith('sv_')) return null;
  const tokenHash = hashToken(token);
  const [row] = await sql`
    SELECT t.id, t.scopes, t.last_used_at, p.user_id, p.email, p.first_name, p.last_name,
      EXISTS (
        SELECT 1 FROM beta_acknowledgements b
        WHERE b.user_id = p.user_id AND b.acknowledgement_version = ${BETA_ACKNOWLEDGEMENT_VERSION}
      ) AS acknowledged
    FROM api_tokens t
    INNER JOIN profiles p ON p.user_id = t.user_id
    WHERE t.token_hash = ${tokenHash}
      AND t.revoked_at IS NULL
      AND (t.expires_at IS NULL OR t.expires_at > NOW())
    LIMIT 1
  `;
  if (!row) return null;

  const lastUsed = row.last_used_at ? new Date(String(row.last_used_at)).getTime() : 0;
  if (Date.now() - lastUsed > LAST_USED_REFRESH_MS) {
    await sql`UPDATE api_tokens SET last_used_at = NOW() WHERE id = ${String(row.id)}::uuid`;
  }

  const email = row.email ? String(row.email) : '';
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || email || 'User';
  return {
    id: String(row.user_id),
    email,
    name,
    acknowledged: Boolean(row.acknowledged),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : ['read', 'write'],
  };
}
