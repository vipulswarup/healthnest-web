import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { isHouseholdMember, requireActiveHouseholdId } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { normalizeWhatsAppPhone } from '@/lib/whatsapp/cloud-api';

async function currentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  return user;
}

const putSchema = z.object({
  phone: z.string().min(8).max(20),
  householdId: z.string().uuid().optional(),
  defaultPatientId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const householdIdParam = request.nextUrl.searchParams.get('householdId');
    const householdId = householdIdParam || await requireActiveHouseholdId(user.id).catch(() => {
      throw new AppError('Create or join a household first', 400, 'NO_HOUSEHOLD');
    });
    if (!(await isHouseholdMember(user.id, householdId))) {
      throw new AppError('Household not found', 404);
    }

    const rows = await sql`
      SELECT phone, household_id, default_patient_id, created_at, updated_at
      FROM whatsapp_sender_maps
      WHERE household_id = ${householdId}::uuid
      ORDER BY created_at ASC
    `;

    return NextResponse.json(rows.map((row) => ({
      phone: String(row.phone),
      householdId: String(row.household_id),
      defaultPatientId: row.default_patient_id ? String(row.default_patient_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    const parsed = putSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const phone = normalizeWhatsAppPhone(parsed.data.phone);
    if (phone.length < 8) throw new AppError('Enter a valid phone number with country code', 400);

    const householdId = parsed.data.householdId
      || await requireActiveHouseholdId(user.id).catch(() => {
        throw new AppError('Create or join a household first', 400, 'NO_HOUSEHOLD');
      });
    if (!(await isHouseholdMember(user.id, householdId))) {
      throw new AppError('Household not found', 404);
    }

    let defaultPatientId = parsed.data.defaultPatientId ?? null;
    if (defaultPatientId) {
      const [linked] = await sql`
        SELECT 1 FROM household_patients
        WHERE household_id = ${householdId}::uuid AND patient_id = ${defaultPatientId}::uuid
        LIMIT 1
      `;
      if (!linked) throw new AppError('Person is not in this household', 400);
    }

    const [existing] = await sql`
      SELECT household_id FROM whatsapp_sender_maps WHERE phone = ${phone} LIMIT 1
    `;
    if (existing && String(existing.household_id) !== householdId) {
      throw new AppError('That WhatsApp number is already linked to another family folder', 409);
    }

    const [row] = await sql`
      INSERT INTO whatsapp_sender_maps (phone, household_id, default_patient_id, updated_at)
      VALUES (${phone}, ${householdId}::uuid, ${defaultPatientId}::uuid, NOW())
      ON CONFLICT (phone) DO UPDATE SET
        household_id = EXCLUDED.household_id,
        default_patient_id = EXCLUDED.default_patient_id,
        updated_at = NOW()
      RETURNING phone, household_id, default_patient_id, created_at, updated_at
    `;

    return NextResponse.json({
      phone: String(row.phone),
      householdId: String(row.household_id),
      defaultPatientId: row.default_patient_id ? String(row.default_patient_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    const phoneRaw = request.nextUrl.searchParams.get('phone');
    const householdIdParam = request.nextUrl.searchParams.get('householdId');
    if (!phoneRaw) throw new AppError('phone is required', 400);

    const phone = normalizeWhatsAppPhone(phoneRaw);
    const householdId = householdIdParam
      || await requireActiveHouseholdId(user.id).catch(() => {
        throw new AppError('Create or join a household first', 400, 'NO_HOUSEHOLD');
      });
    if (!(await isHouseholdMember(user.id, householdId))) {
      throw new AppError('Household not found', 404);
    }

    const result = await sql`
      DELETE FROM whatsapp_sender_maps
      WHERE phone = ${phone} AND household_id = ${householdId}::uuid
      RETURNING phone
    `;
    if (!result.length) throw new AppError('Linked number not found', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
