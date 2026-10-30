import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessPatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';
import { deletePatientFilePassword } from '@/lib/services/file-password.service';

const idSchema = z.string().uuid();

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; passwordId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const ids = await params;
    const patientId = idSchema.safeParse(ids.id);
    const passwordId = idSchema.safeParse(ids.passwordId);
    if (!patientId.success || !passwordId.success) throw new AppError('Invalid ID', 400);
    if (!(await canAccessPatient(user.id, patientId.data))) {
      throw new AppError('Patient not found', 404);
    }
    const deleted = await deletePatientFilePassword({
      patientId: patientId.data,
      passwordId: passwordId.data,
    });
    if (!deleted) throw new AppError('Password not found', 404);
    await recordAuditEvent({
      actorId: user.id,
      patientId: patientId.data,
      eventType: 'updated',
      entityType: 'patient',
      entityId: patientId.data,
      metadata: { filePassword: 'deleted' },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
