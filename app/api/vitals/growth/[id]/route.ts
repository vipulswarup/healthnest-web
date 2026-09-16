import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { deleteGrowthMeasurement } from '@/lib/services/growth.service';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid measurement ID', 400);

    const deleted = await deleteGrowthMeasurement(user.id, id);
    if (!deleted) throw new AppError('Measurement not found', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
