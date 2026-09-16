import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import { toPatient } from '@/lib/db/mappers';
import { getCurrentUser } from '@/lib/auth/session';
import {
  isHouseholdMember,
  linkPatientToHousehold,
  listPatientsForContext,
  requireActiveHouseholdId,
} from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';

const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(), lastName: z.string().optional(), title: z.string().optional(), suffix: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.string().min(1, 'Gender is required'), abhaNumber: z.string().optional(), bloodGroup: z.string().optional(),
  emergencyContacts: z.array(z.object({ name: z.string().min(1), phone: z.string().min(1), relation: z.string().min(1) })).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  hospitalIdentifiers: z.array(z.object({ systemName: z.string(), identifierType: z.string(), value: z.string() })).optional(),
  mobileNumbers: z.array(z.object({ countryCode: z.string(), number: z.string() })).optional(),
  householdId: z.string().uuid('A household is required'),
});

async function currentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  return user;
}

export async function GET() {
  try {
    const user = await currentUser();
    let householdId: string;
    try {
      householdId = await requireActiveHouseholdId(user.id);
    } catch {
      throw new AppError('Create or join a household before managing patients', 400, 'NO_HOUSEHOLD');
    }
    const patients = await listPatientsForContext(user.id, householdId);
    return NextResponse.json(patients.map(toPatient));
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const parsed = patientSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;

    if (!(await isHouseholdMember(user.id, data.householdId))) {
      throw new AppError('Not a member of that household', 403);
    }

    const [patient] = await sql`
      INSERT INTO patients (
        owner_id, first_name, middle_name, last_name, title, suffix, emails, mobile_numbers, date_of_birth, gender,
        abha_number, blood_group, emergency_contacts, preferences, hospital_identifiers
      ) VALUES (
        ${user.id}, ${data.firstName}, ${data.middleName || null}, ${data.lastName || null}, ${data.title || null}, ${data.suffix || null},
        ${JSON.stringify(data.emails || [])}::jsonb, ${JSON.stringify(data.mobileNumbers || [])}::jsonb, ${data.dateOfBirth}::date, ${data.gender},
        ${data.abhaNumber || null}, ${data.bloodGroup || null}, ${JSON.stringify(data.emergencyContacts || [])}::jsonb,
        ${JSON.stringify(data.preferences || {})}::jsonb, ${JSON.stringify(data.hospitalIdentifiers || [])}::jsonb
      ) RETURNING *
    `;
    await linkPatientToHousehold(data.householdId, patient.id);
    await recordAuditEvent({
      actorId: user.id,
      patientId: patient.id,
      eventType: 'created',
      entityType: 'patient',
      entityId: patient.id,
      metadata: { householdLinked: true },
    });
    return NextResponse.json(toPatient({ ...patient, household_id: data.householdId }), { status: 201 });
  } catch (error) { return handleError(error); }
}
