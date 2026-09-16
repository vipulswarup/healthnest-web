import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { getHouseholdForMember } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const uuidSchema = z.string().uuid();

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const { id, inviteId } = await params;
    const householdId = uuidSchema.safeParse(id);
    const inviteParsed = uuidSchema.safeParse(inviteId);
    if (!householdId.success) throw new AppError('Invalid household ID', 400);
    if (!inviteParsed.success) throw new AppError('Invalid invite ID', 400);

    const household = await getHouseholdForMember(householdId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const [invite] = await sql`
      SELECT * FROM household_invites
      WHERE id = ${inviteParsed.data}::uuid AND household_id = ${householdId.data}::uuid
      LIMIT 1
    `;
    if (!invite) throw new AppError('Invite not found', 404);
    if (invite.status !== 'pending') {
      throw new AppError('Only pending invites can be revoked', 400);
    }

    await sql`
      UPDATE household_invites
      SET status = 'revoked', updated_at = NOW()
      WHERE id = ${inviteParsed.data}::uuid
    `;

    return NextResponse.json({ message: 'Invite revoked' });
  } catch (error) {
    return handleError(error);
  }
}
