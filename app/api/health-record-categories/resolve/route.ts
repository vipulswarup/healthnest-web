import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { resolveCustomRecordType } from '@/lib/services/category-resolve.service';

const bodySchema = z.object({
  label: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  try {
    if (!await getCurrentUser()) throw new AppError('Unauthorized', 401);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const result = await resolveCustomRecordType(parsed.data.label);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
