import { NextRequest, NextResponse } from 'next/server';
import { createMobileSession, parseBearerToken, revokeMobileToken } from '@/lib/auth/mobile-session';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const session = await createMobileSession(user.id, 'native-app');
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const token = parseBearerToken(request.headers.get('authorization'));
    if (token) await revokeMobileToken(token, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
