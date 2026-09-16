import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import {
  assertCanDissolveOrLeave,
  dissolveHouseholdIfEmpty,
  getActiveHouseholdId,
  setActiveHouseholdId,
} from '@/lib/households/access';
import { getHouseholdForMember } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
type OrphanPatient = { id?: unknown; first_name?: unknown; last_name?: unknown };

function orphanError(err: unknown): never {
  if (err instanceof Error && err.message === 'ORPHAN_PATIENTS') {
    const patients = (err as Error & { patients?: OrphanPatient[] }).patients || [];
    throw new AppError(
      'Cannot leave or dissolve: some patients belong only to this household. Link them to another household or delete them first.',
      400,
      'ORPHAN_PATIENTS',
      { patients: patients.map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name })) }
    );
  }
  throw err;
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const members = await sql`
      SELECT user_id FROM household_members WHERE household_id = ${parsedId.data}::uuid
    `;
    const isLastMember = members.length === 1 && members[0].user_id === user.id;

    if (isLastMember) {
      try {
        await assertCanDissolveOrLeave(parsedId.data);
      } catch (err) {
        orphanError(err);
      }
    }

    await sql`
      DELETE FROM household_members
      WHERE household_id = ${parsedId.data}::uuid AND user_id = ${user.id}
    `;

    let dissolved = false;
    if (isLastMember) {
      try {
        dissolved = await dissolveHouseholdIfEmpty(parsedId.data);
      } catch (err) {
        orphanError(err);
      }
    }

    const active = await getActiveHouseholdId(user.id);
    if (!active || active === parsedId.data) {
      // getActiveHouseholdId already falls back; clear invalid pref by re-resolving
      const remaining = await getActiveHouseholdId(user.id);
      if (remaining && remaining !== parsedId.data) {
        await setActiveHouseholdId(user.id, remaining);
      } else if (!remaining) {
        await sql`
          UPDATE profiles
          SET preferences = preferences - 'activeHouseholdId', updated_at = NOW()
          WHERE user_id = ${user.id}
        `;
      }
    }

    return NextResponse.json({
      message: dissolved ? 'Left and dissolved household' : 'Left household',
      dissolved,
    });
  } catch (error) {
    return handleError(error);
  }
}
