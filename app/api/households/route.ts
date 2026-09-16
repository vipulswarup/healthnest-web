import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { setActiveHouseholdId } from '@/lib/households/access';
import { toHousehold } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const rows = await sql`
      SELECT h.*
      FROM households h
      INNER JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = ${user.id}
      ORDER BY h.name ASC
    `;
    return NextResponse.json(rows.map(toHousehold));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const [household] = await sql`
      INSERT INTO households (name, created_by)
      VALUES (${parsed.data.name}, ${user.id})
      RETURNING *
    `;
    await sql`
      INSERT INTO household_members (household_id, user_id)
      VALUES (${household.id}::uuid, ${user.id})
    `;
    await setActiveHouseholdId(user.id, household.id);

    return NextResponse.json(toHousehold(household), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
