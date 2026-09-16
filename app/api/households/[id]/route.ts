import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { assertCanDissolveOrLeave, dissolveHouseholdIfEmpty } from '@/lib/households/access';
import { getHouseholdForMember, toHousehold } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
type OrphanPatient = { id?: unknown; first_name?: unknown; last_name?: unknown };
const updateSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

async function memberHousehold(params: Promise<{ id: string }>, userId: string) {
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) throw new AppError('Invalid household ID', 400);
  const household = await getHouseholdForMember(parsedId.data, userId);
  if (!household) throw new AppError('Household not found', 404);
  return { id: parsedId.data, household };
}

function orphanError(err: unknown): never {
  if (err instanceof Error && err.message === 'ORPHAN_PATIENTS') {
    const patients = (err as Error & { patients?: OrphanPatient[] }).patients || [];
    throw new AppError(
      'Cannot dissolve: some patients belong only to this household. Link them to another household or delete them first.',
      400,
      'ORPHAN_PATIENTS',
      { patients: patients.map((p) => ({ id: p.id, firstName: p.first_name, lastName: p.last_name })) }
    );
  }
  throw err;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const { household } = await memberHousehold(params, user.id);
    return NextResponse.json(toHousehold(household));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const { id } = await memberHousehold(params, user.id);

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const [updated] = await sql`
      UPDATE households
      SET name = ${parsed.data.name}, updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;
    return NextResponse.json(toHousehold(updated));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const { id } = await memberHousehold(params, user.id);

    try {
      await assertCanDissolveOrLeave(id);
    } catch (err) {
      orphanError(err);
    }

    await sql`DELETE FROM household_members WHERE household_id = ${id}::uuid`;
    try {
      await dissolveHouseholdIfEmpty(id);
    } catch (err) {
      orphanError(err);
    }

    return NextResponse.json({ message: 'Household dissolved' });
  } catch (error) {
    return handleError(error);
  }
}
