import { NextRequest, NextResponse } from 'next/server';
import { guardAuthRequest } from '@/lib/security/auth-request';
import { consumeAuthLimit } from '@/lib/security/auth-rate-limit';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { createMobileSession } from '@/lib/auth/mobile-session';
import { ensureProfile } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const rejection = await guardAuthRequest(request, consumeAuthLimit);
  if (rejection) return rejection;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError('Email and password are required', 400);

    const email = parsed.data.email.trim().toLowerCase();
    const { data, error } = await auth.signIn.email({
      email,
      password: parsed.data.password,
    });
    const user = data?.user;
    if (error || !user?.id) {
      throw new AppError(error?.message || 'Invalid email or password', 401);
    }

    const userEmail = user.email?.trim().toLowerCase() || email;
    const name = user.name?.trim() || userEmail || 'User';
    await ensureProfile({ id: user.id, email: userEmail, name });
    const session = await createMobileSession(user.id, 'email');
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
