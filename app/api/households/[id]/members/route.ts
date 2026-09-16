import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { getHouseholdForMember, toHouseholdMember } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const rows = await sql`
      SELECT hm.household_id, hm.user_id, hm.joined_at, p.email, p.first_name, p.last_name
      FROM household_members hm
      LEFT JOIN profiles p ON p.user_id = hm.user_id
      WHERE hm.household_id = ${parsedId.data}::uuid
      ORDER BY hm.joined_at ASC
    `;
    return NextResponse.json(rows.map(toHouseholdMember));
  } catch (error) {
    return handleError(error);
  }
}
