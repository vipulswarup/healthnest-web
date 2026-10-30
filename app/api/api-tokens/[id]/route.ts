import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revokeApiToken } from '@/lib/auth/api-token';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = z.string().uuid().parse((await params).id);
    const ok = await revokeApiToken(user.id, id);
    if (!ok) throw new AppError('Token not found', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
