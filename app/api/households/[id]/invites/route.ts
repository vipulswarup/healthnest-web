import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { sendHouseholdInviteEmail } from '@/lib/email/send';
import { appBaseUrl } from '@/lib/email/templates';
import {
  generateInviteToken,
  getHouseholdForMember,
  toHouseholdInvite,
} from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
const inviteSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const rows = await sql`
      SELECT i.*, h.name AS household_name,
        CONCAT_WS(' ', p.first_name, p.last_name) AS invited_by_name
      FROM household_invites i
      INNER JOIN households h ON h.id = i.household_id
      LEFT JOIN profiles p ON p.user_id = i.invited_by
      WHERE i.household_id = ${parsedId.data}::uuid
      ORDER BY i.created_at DESC
    `;
    return NextResponse.json(rows.map(toHouseholdInvite));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const parsed = inviteSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const email = parsed.data.email.toLowerCase();
    if (email === user.email?.toLowerCase()) {
      throw new AppError('You cannot invite yourself', 400);
    }

    const [existingMember] = await sql`
      SELECT hm.user_id
      FROM household_members hm
      INNER JOIN profiles p ON p.user_id = hm.user_id
      WHERE hm.household_id = ${parsedId.data}::uuid AND LOWER(p.email) = ${email}
      LIMIT 1
    `;
    if (existingMember) throw new AppError('User is already a household member', 400);

    await sql`
      UPDATE household_invites
      SET status = 'revoked', updated_at = NOW()
      WHERE household_id = ${parsedId.data}::uuid
        AND LOWER(email) = ${email}
        AND status = 'pending'
    `;

    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await sql`
      INSERT INTO household_invites (household_id, email, token, invited_by, expires_at)
      VALUES (${parsedId.data}::uuid, ${email}, ${token}, ${user.id}, ${expiresAt.toISOString()}::timestamptz)
      RETURNING *
    `;

    const acceptUrl = `${appBaseUrl()}/households/invites/${token}`;
    const emailResult = await sendHouseholdInviteEmail({
      to: email,
      householdName: household.name,
      inviterName: user.name || user.email,
      acceptUrl,
    });

    const { notifyHousehold } = await import('@/lib/services/device-push.service');
    await notifyHousehold(parsedId.data, {
      title: 'Family invite sent',
      body: `${email} was invited to the family folder.`,
      data: { householdId: parsedId.data },
    }, user.id);

    return NextResponse.json(
      {
        ...toHouseholdInvite({ ...invite, household_name: household.name }),
        emailSent: emailResult.sent,
        emailError: emailResult.error,
        acceptUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
