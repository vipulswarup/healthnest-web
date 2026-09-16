import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAppleIdentityToken } from '@/lib/auth/apple';
import { createMobileSession } from '@/lib/auth/mobile-session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const schema = z.object({
  identityToken: z.string().min(20),
  fullName: z.string().max(160).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName || 'User', lastName: rest.length ? rest.join(' ') : null };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new AppError('Apple sign-in did not return a token', 400);
    const identity = await verifyAppleIdentityToken(parsed.data.identityToken).catch(() => {
      throw new AppError('Apple sign-in could not be verified', 401);
    });
    const email = identity.email || parsed.data.email?.trim().toLowerCase() || null;
    const name = parsed.data.fullName?.trim() || '';

    const [linked] = await sql`
      SELECT user_id FROM apple_identities WHERE apple_sub = ${identity.sub} LIMIT 1
    `;
    let userId = linked ? String(linked.user_id) : null;

    if (!userId && email) {
      const [profile] = await sql`
        SELECT user_id FROM profiles WHERE LOWER(email) = ${email} LIMIT 1
      `;
      if (profile) userId = String(profile.user_id);
    }

    if (!userId) {
      userId = `apple:${identity.sub}`;
      const { firstName, lastName } = splitName(name || (email ? email.split('@')[0] : 'Family member'));
      await sql`
        INSERT INTO profiles (user_id, first_name, last_name, email)
        VALUES (${userId}, ${firstName}, ${lastName}, ${email})
        ON CONFLICT (user_id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, profiles.email),
          updated_at = NOW()
      `;
    }

    await sql`
      INSERT INTO apple_identities (apple_sub, user_id, email)
      VALUES (${identity.sub}, ${userId}, ${email})
      ON CONFLICT (apple_sub) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = COALESCE(EXCLUDED.email, apple_identities.email)
    `;

    const session = await createMobileSession(userId, 'apple');
    return NextResponse.json({ ...session, userId }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
