import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { registerDeviceToken } from '@/lib/services/device-push.service';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const schema = z.object({
  token: z.string().min(8).max(4096),
  platform: z.enum(['ios', 'android']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError('A device token is required', 400);
    await registerDeviceToken({ userId: user.id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
