import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const [profile] = await sql`
      UPDATE profiles
      SET onboarding_completed = TRUE, updated_at = NOW()
      WHERE user_id = ${user.id}
      RETURNING *
    `;
    if (!profile) throw new AppError('User not found', 404);

    return NextResponse.json({
      id: String(profile.user_id),
      email: profile.email || null,
      firstName: profile.first_name,
      lastName: profile.last_name || null,
      preferences: profile.preferences || {},
      onboardingCompleted: Boolean(profile.onboarding_completed),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    return handleError(error);
  }
}
