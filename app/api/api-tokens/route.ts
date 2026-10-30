import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiToken, listApiTokens } from '@/lib/auth/api-token';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    return NextResponse.json(await listApiTokens(user.id));
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
    const token = await createApiToken(user.id, parsed.data.name);
    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
