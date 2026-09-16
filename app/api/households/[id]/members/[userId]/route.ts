import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import {
  assertCanDissolveOrLeave,
  dissolveHouseholdIfEmpty,
} from '@/lib/households/access';
import { getHouseholdForMember } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
type OrphanPatient = { id?: unknown; first_name?: unknown; last_name?: unknown };

function orphanError(err: unknown): never {
  if (err instanceof Error && err.message === 'ORPHAN_PATIENTS') {
    const patients = (err as Error & { patients?: OrphanPatient[] }).patients || [];
    throw new AppError(
      'Cannot remove the last member: some patients belong only to this household. Link them elsewhere or delete them first.',
      400,
      'ORPHAN_PATIENTS',
      { patients: patients.map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name })) }
    );
  }
  throw err;
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const { id, userId: targetUserId } = await params;
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);
    if (!targetUserId) throw new AppError('Invalid user ID', 400);

    if (targetUserId === user.id) {
      throw new AppError('Use leave to remove yourself from the household', 400);
    }

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const members = await sql`
      SELECT user_id FROM household_members WHERE household_id = ${parsedId.data}::uuid
    `;
    const remainingAfter = members.filter((m) => m.user_id !== targetUserId).length;
    if (remainingAfter === 0) {
      try {
        await assertCanDissolveOrLeave(parsedId.data);
      } catch (err) {
        orphanError(err);
      }
    }

    const [removed] = await sql`
      DELETE FROM household_members
      WHERE household_id = ${parsedId.data}::uuid AND user_id = ${targetUserId}
      RETURNING user_id
    `;
    if (!removed) throw new AppError('Member not found', 404);

    if (remainingAfter === 0) {
      try {
        await dissolveHouseholdIfEmpty(parsedId.data);
      } catch (err) {
        orphanError(err);
      }
    }

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    return handleError(error);
  }
}
