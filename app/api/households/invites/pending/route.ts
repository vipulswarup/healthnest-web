import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { toHouseholdInvite } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    if (!user.email) throw new AppError('Account email required', 400);

    const email = user.email.toLowerCase();

    await sql`
      UPDATE household_invites
      SET status = 'expired', updated_at = NOW()
      WHERE LOWER(email) = ${email}
        AND status = 'pending'
        AND expires_at < NOW()
    `;

    const rows = await sql`
      SELECT i.*, h.name AS household_name,
        CONCAT_WS(' ', p.first_name, p.last_name) AS invited_by_name
      FROM household_invites i
      INNER JOIN households h ON h.id = i.household_id
      LEFT JOIN profiles p ON p.user_id = i.invited_by
      WHERE LOWER(i.email) = ${email}
        AND i.status = 'pending'
        AND i.expires_at >= NOW()
      ORDER BY i.created_at DESC
    `;

    return NextResponse.json(rows.map(toHouseholdInvite));
  } catch (error) {
    return handleError(error);
  }
}
