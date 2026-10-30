import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { processDeletionJobs, requireIdentityDeletionConfiguration } from '@/lib/services/deletion.service';
import { appleRevocationConfigured, exchangeAppleCode } from '@/lib/auth/apple';
import { encryptSecret } from '@/lib/security/secret-box';

export const maxDuration = 60;
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Sign in to delete your account', 401);
    const families = await sql`SELECT h.id, h.name,
      NOT EXISTS (SELECT 1 FROM household_members other WHERE other.household_id = h.id AND other.user_id <> ${user.id}) AS will_delete
      FROM households h WHERE h.created_by = ${user.id} OR EXISTS
      (SELECT 1 FROM household_members m WHERE m.household_id = h.id AND m.user_id = ${user.id}) ORDER BY h.name`;
    const apple = await sql`SELECT 1 FROM apple_identities WHERE user_id = ${user.id} AND refresh_token_ciphertext IS NULL`;
    return NextResponse.json({ families, needsAppleReauthentication: apple.length > 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return handleError(error); }
}

const schema = z.object({ confirmation: z.literal('DELETE'), appleAuthorizationCode: z.string().min(1).optional() });
export async function POST(request: NextRequest) {
  try {
    // Deletion is available even if the user has not accepted the beta notice.
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Sign in to delete your account', 401);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError('Type DELETE to confirm account deletion', 400);
    requireIdentityDeletionConfiguration(user.id);
    const identities = await sql`SELECT apple_sub, refresh_token_ciphertext FROM apple_identities WHERE user_id = ${user.id}`;
    if (identities.length && !appleRevocationConfigured()) {
      throw new AppError('Apple account deletion is temporarily unavailable. Request deletion at support@eisenvault.com.', 503);
    }
    for (const identity of identities) {
      if (identity.refresh_token_ciphertext) continue;
      if (!parsed.data.appleAuthorizationCode) throw new AppError('Confirm with Apple in the SanoVault mobile app, or request deletion at support@eisenvault.com.', 409, 'APPLE_REAUTH_REQUIRED');
      const token = await exchangeAppleCode(parsed.data.appleAuthorizationCode, String(identity.apple_sub));
      await sql`UPDATE apple_identities SET refresh_token_ciphertext = ${encryptSecret(token)} WHERE apple_sub = ${String(identity.apple_sub)} AND user_id = ${user.id}`;
    }
    await sql`SELECT erase_login_account(${user.id})`;
    after(() => processDeletionJobs().then(() => undefined));
    return NextResponse.json({ message: 'Your account data has been removed and access revoked. Stored-file and sign-in-provider cleanup is processing.' }, { status: 202 });
  } catch (error) { return handleError(error); }
}
