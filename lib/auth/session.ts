import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/server';
import { getUserFromApiToken } from '@/lib/auth/api-token';
import { getUserFromMobileToken, parseBearerToken } from '@/lib/auth/mobile-session';
import { sql } from '@/lib/db/neon';
import { BETA_ACKNOWLEDGEMENT_VERSION } from '@/lib/legal/beta-acknowledgement';

export type CurrentUser = { id: string; email: string; name: string; acknowledged?: boolean };

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName || 'User', lastName: rest.length ? rest.join(' ') : null };
}

/** Create or refresh the local profile. Call from sign-up / acknowledgement writes, not from GET handlers. */
export async function ensureProfile(user: CurrentUser) {
  if (await isDeletedAccount(user.id)) throw new Error('This account has been deleted');
  const { firstName, lastName } = splitName(user.name);
  await sql`
    INSERT INTO profiles (user_id, first_name, last_name, email)
    VALUES (${user.id}, ${firstName}, ${lastName}, ${user.email || null})
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW()
  `;
}

export async function isDeletedAccount(userId: string) {
  const [row] = await sql`SELECT 1 FROM deleted_accounts WHERE user_id_hash = encode(digest(${userId}, 'sha256'), 'hex')`;
  return Boolean(row);
}

async function resolveAuthenticatedUser(): Promise<CurrentUser | null> {
  const headerList = await headers();
  const bearer = parseBearerToken(headerList.get('authorization'));
  if (bearer) {
    if (bearer.startsWith('sv_')) {
      const apiUser = await getUserFromApiToken(bearer);
      if (!apiUser) return null;
      return {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name,
        acknowledged: apiUser.acknowledged,
      };
    }
    return getUserFromMobileToken(bearer);
  }

  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;

  if (await isDeletedAccount(user.id)) return null;

  const email = user.email?.trim().toLowerCase() || '';
  const name = user.name?.trim() || email || 'User';
  return { id: user.id, email, name };
}

/**
 * Returns an authenticated user without writing to the database.
 * This is intentionally not the default for health-data routes: use getCurrentUser()
 * there so beta acknowledgement remains mandatory before data access.
 */
export const getAuthenticatedUser = cache(resolveAuthenticatedUser);

async function resolveCurrentUser(): Promise<CurrentUser | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  // Mobile tokens resolve the acknowledgement in the same query as the session.
  if (user.acknowledged !== undefined) return user.acknowledged ? user : null;

  const [acknowledgement] = await sql`
    SELECT 1
    FROM beta_acknowledgements
    WHERE user_id = ${user.id}
      AND acknowledgement_version = ${BETA_ACKNOWLEDGEMENT_VERSION}
    LIMIT 1
  `;

  return acknowledgement ? user : null;
}

/**
 * Returns a user only after the current beta acknowledgement has been stored.
 * Keeping this enforcement alongside the shared session helper means every
 * API route that uses it fails closed if an account bypasses the sign-up UI.
 */
export const getCurrentUser = cache(resolveCurrentUser);

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}
