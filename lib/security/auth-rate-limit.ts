import 'server-only';
import { createHmac } from 'node:crypto';
import { sql } from '@/lib/db/neon';

/** Persistent atomic limits work across serverless instances; raw email/IP is never stored. */
export async function consumeAuthLimit(identity: string, limit: number): Promise<boolean> {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error('Auth rate limit secret is missing');
  const key = createHmac('sha256', secret).update(identity).digest('hex');
  const rows = await sql`
    INSERT INTO auth_rate_limits (identity_hash, window_start, request_count)
    VALUES (${key}, date_trunc('hour', NOW()), 1)
    ON CONFLICT (identity_hash) DO UPDATE SET
      window_start = date_trunc('hour', NOW()),
      request_count = CASE WHEN auth_rate_limits.window_start < date_trunc('hour', NOW())
        THEN 1 ELSE auth_rate_limits.request_count + 1 END
    WHERE auth_rate_limits.window_start < date_trunc('hour', NOW())
      OR auth_rate_limits.request_count < ${limit}
    RETURNING request_count
  `;
  return rows.length > 0;
}
