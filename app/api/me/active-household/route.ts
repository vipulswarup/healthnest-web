import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getActiveHouseholdId,
  setActiveHouseholdId,
} from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const schema = z.object({
  householdId: z.string().uuid(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const activeHouseholdId = await getActiveHouseholdId(user.id);
    return NextResponse.json({ householdId: activeHouseholdId });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    try {
      await setActiveHouseholdId(user.id, parsed.data.householdId);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_HOUSEHOLD_MEMBER') {
        throw new AppError('Not a member of that household', 403);
      }
      throw err;
    }

    return NextResponse.json({ householdId: parsed.data.householdId });
  } catch (error) {
    return handleError(error);
  }
}
