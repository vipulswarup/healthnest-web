import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessPatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';
import {
  addPatientFilePassword,
  listPatientFilePasswords,
} from '@/lib/services/file-password.service';

const idSchema = z.string().uuid();
const createSchema = z.object({
  password: z.string().min(1).max(128),
});

async function userAndPatient(params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) throw new AppError('Invalid patient ID', 400);
  if (!(await canAccessPatient(user.id, parsedId.data))) {
    throw new AppError('Patient not found', 404);
  }
  return { user, patientId: parsedId.data };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { patientId } = await userAndPatient(params);
    const passwords = await listPatientFilePasswords(patientId);
    return NextResponse.json(passwords.map((row) => ({
      id: row.id,
      password: row.password,
      createdAt: row.createdAt,
    })));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, patientId } = await userAndPatient(params);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const saved = await addPatientFilePassword({
      patientId,
      userId: user.id,
      password: parsed.data.password,
    });
    await recordAuditEvent({
      actorId: user.id,
      patientId,
      eventType: 'updated',
      entityType: 'patient',
      entityId: patientId,
      metadata: { filePassword: 'added' },
    });
    return NextResponse.json({
      id: saved.id,
      password: saved.password,
      createdAt: saved.createdAt,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
