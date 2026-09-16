import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { toPatient } from '@/lib/db/mappers';
import {
  canAccessPatient,
  linkPatientToHousehold,
  listAccessiblePatients,
  setActiveHouseholdId,
} from '@/lib/households/access';
import { toPublicHouseholdInvite } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const acceptSchema = z.object({
  patientIds: z.array(z.string().uuid()).default([]),
  decline: z.boolean().optional(),
});

async function loadInviteByToken(token: string) {
  const [invite] = await sql`
    SELECT i.*, h.name AS household_name,
      CONCAT_WS(' ', p.first_name, p.last_name) AS invited_by_name
    FROM household_invites i
    INNER JOIN households h ON h.id = i.household_id
    LEFT JOIN profiles p ON p.user_id = i.invited_by
    WHERE i.token = ${token}
    LIMIT 1
  `;
  return invite || null;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();

    const { token } = await params;
    if (!token) throw new AppError('Invalid invite token', 400);

    const invite = await loadInviteByToken(token);
    if (!invite) throw new AppError('Invite not found', 404);

    if (invite.status === 'pending' && new Date(invite.expires_at) < new Date()) {
      await sql`
        UPDATE household_invites SET status = 'expired', updated_at = NOW()
        WHERE id = ${invite.id}::uuid
      `;
      invite.status = 'expired';
    }

    const invitePayload = toPublicHouseholdInvite(invite);

    // Public preview for logged-out invitees (no patient list).
    if (!user) {
      return NextResponse.json({
        invite: invitePayload,
        shareablePatients: [],
        emailMatches: false,
        authenticated: false,
      });
    }

    const accessible = await listAccessiblePatients(user.id);
    const alreadyLinked = await sql`
      SELECT patient_id FROM household_patients WHERE household_id = ${invite.household_id}::uuid
    `;
    const linkedSet = new Set(alreadyLinked.map((r) => String(r.patient_id)));
    const shareablePatients = accessible.filter((p) => !linkedSet.has(String(p.id)));

    return NextResponse.json({
      invite: invitePayload,
      shareablePatients: shareablePatients.map(toPatient),
      emailMatches: user.email?.toLowerCase() === String(invite.email).toLowerCase(),
      authenticated: true,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    if (!user.email) throw new AppError('Account email required', 400);

    const { token } = await params;
    if (!token) throw new AppError('Invalid invite token', 400);

    const parsed = acceptSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const invite = await loadInviteByToken(token);
    if (!invite) throw new AppError('Invite not found', 404);

    if (invite.status !== 'pending') {
      throw new AppError(`Invite is ${invite.status}`, 400);
    }

    if (new Date(invite.expires_at) < new Date()) {
      await sql`
        UPDATE household_invites SET status = 'expired', updated_at = NOW()
        WHERE id = ${invite.id}::uuid
      `;
      throw new AppError('Invite has expired', 400);
    }

    if (parsed.data.decline) {
      await sql`
        UPDATE household_invites SET status = 'declined', updated_at = NOW()
        WHERE id = ${invite.id}::uuid
      `;
      return NextResponse.json({ message: 'Invite declined' });
    }

    const [existing] = await sql`
      SELECT 1 FROM household_members
      WHERE household_id = ${invite.household_id}::uuid AND user_id = ${user.id}
      LIMIT 1
    `;
    if (!existing) {
      await sql`
        INSERT INTO household_members (household_id, user_id)
        VALUES (${invite.household_id}::uuid, ${user.id})
      `;
    }

    const patientIds = parsed.data.patientIds;
    for (const patientId of patientIds) {
      if (!(await canAccessPatient(user.id, patientId))) {
        throw new AppError('One or more selected patients are not accessible', 400);
      }
      await linkPatientToHousehold(invite.household_id, patientId);
    }

    await sql`
      UPDATE household_invites SET status = 'accepted', updated_at = NOW()
      WHERE id = ${invite.id}::uuid
    `;

    await setActiveHouseholdId(user.id, invite.household_id);

    return NextResponse.json({
      message: 'Joined household',
      householdId: invite.household_id,
      patientsLinked: patientIds.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
