import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import { toPatient } from '@/lib/db/mappers';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessPatient, getAccessiblePatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';

const idSchema = z.string().uuid();
const updateSchema = z.object({
  firstName: z.string().min(1).optional(), middleName: z.string().optional(), lastName: z.string().optional(), title: z.string().optional(), suffix: z.string().optional(),
  emails: z.array(z.string().email()).optional(), dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  gender: z.string().optional(), abhaNumber: z.string().optional(), bloodGroup: z.string().optional(),
  emergencyContacts: z.array(z.object({ name: z.string().min(1), phone: z.string().min(1), relation: z.string().min(1) })).optional(),
  preferences: z.record(z.string(), z.any()).optional(), hospitalIdentifiers: z.array(z.object({ systemName: z.string(), identifierType: z.string(), value: z.string() })).optional(),
  mobileNumbers: z.array(z.object({ countryCode: z.string(), number: z.string() })).optional(),
});

async function userAndId(params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) throw new AppError('Invalid patient ID', 400);
  return { user, id: parsedId.data };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await userAndId(params);
    const patient = await getAccessiblePatient(user.id, id);
    if (!patient) throw new AppError('Patient not found', 404);
    return NextResponse.json(toPatient(patient));
  } catch (error) { return handleError(error); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await userAndId(params);
    if (!(await canAccessPatient(user.id, id))) throw new AppError('Patient not found', 404);

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;
    const [patient] = await sql`
      UPDATE patients SET
        first_name = COALESCE(${data.firstName ?? null}, first_name), middle_name = COALESCE(${data.middleName ?? null}, middle_name),
        last_name = COALESCE(${data.lastName ?? null}, last_name), title = COALESCE(${data.title ?? null}, title), suffix = COALESCE(${data.suffix ?? null}, suffix),
        emails = COALESCE(${data.emails === undefined ? null : JSON.stringify(data.emails)}::jsonb, emails),
        mobile_numbers = COALESCE(${data.mobileNumbers === undefined ? null : JSON.stringify(data.mobileNumbers)}::jsonb, mobile_numbers),
        date_of_birth = COALESCE(${data.dateOfBirth ?? null}::date, date_of_birth), gender = COALESCE(${data.gender ?? null}, gender),
        abha_number = COALESCE(${data.abhaNumber ?? null}, abha_number), blood_group = COALESCE(${data.bloodGroup ?? null}, blood_group),
        emergency_contacts = COALESCE(${data.emergencyContacts === undefined ? null : JSON.stringify(data.emergencyContacts)}::jsonb, emergency_contacts),
        preferences = COALESCE(${data.preferences === undefined ? null : JSON.stringify(data.preferences)}::jsonb, preferences),
        hospital_identifiers = COALESCE(${data.hospitalIdentifiers === undefined ? null : JSON.stringify(data.hospitalIdentifiers)}::jsonb, hospital_identifiers),
        updated_at = NOW()
      WHERE id = ${id}::uuid RETURNING *
    `;
    if (!patient) throw new AppError('Patient not found', 404);
    await recordAuditEvent({
      actorId: user.id,
      patientId: id,
      eventType: 'updated',
      entityType: 'patient',
      entityId: id,
      metadata: { changedFields: Object.keys(data) },
    });
    return NextResponse.json(toPatient(patient));
  } catch (error) { return handleError(error); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await userAndId(params);
    if (!(await canAccessPatient(user.id, id))) throw new AppError('Patient not found', 404);
    const [patient] = await sql`DELETE FROM patients WHERE id = ${id}::uuid RETURNING id`;
    if (!patient) throw new AppError('Patient not found', 404);
    await recordAuditEvent({
      actorId: user.id,
      eventType: 'deleted',
      entityType: 'patient',
      entityId: id,
    });
    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) { return handleError(error); }
}
