import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { eraseFamily, processDeletionJobs } from '@/lib/services/deletion.service';
import { after } from 'next/server';
import { getHouseholdForMember, toHousehold } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
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

    await eraseFamily(user.id, id);
    after(() => processDeletionJobs().then(() => undefined));

    return NextResponse.json({ message: 'Family deleted' });
  } catch (error) {
    return handleError(error);
  }
}
