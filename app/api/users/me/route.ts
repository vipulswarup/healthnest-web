import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().nullable().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  onboardingCompleted: z.boolean().optional(),
});

function toProfile(row: Record<string, unknown>) {
  return {
    id: String(row.user_id),
    email: row.email || null,
    firstName: row.first_name,
    lastName: row.last_name || null,
    preferences: row.preferences || {},
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentProfile() {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const [profile] = await sql`SELECT * FROM profiles WHERE user_id = ${user.id}`;
  if (!profile) throw new AppError('User not found', 404);
  return { user, profile };
}

export async function GET() {
  try {
    const { profile } = await currentProfile();
    return NextResponse.json(toProfile(profile));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user } = await currentProfile();
    const parsed = updateProfileSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;

    const [profile] = await sql`
      UPDATE profiles SET
        first_name = COALESCE(${data.firstName ?? null}, first_name),
        last_name = COALESCE(${data.lastName ?? null}, last_name),
        preferences = COALESCE(${data.preferences === undefined ? null : JSON.stringify(data.preferences)}::jsonb, preferences),
        onboarding_completed = COALESCE(${data.onboardingCompleted ?? null}, onboarding_completed),
        updated_at = NOW()
      WHERE user_id = ${user.id}
      RETURNING *
    `;
    return NextResponse.json(toProfile(profile));
  } catch (error) {
    return handleError(error);
  }
}
