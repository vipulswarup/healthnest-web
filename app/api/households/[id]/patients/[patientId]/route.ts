import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { removeFamilyPatient, processDeletionJobs } from '@/lib/services/deletion.service';
import { after } from 'next/server';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const uuidSchema = z.string().uuid();

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; patientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const { id, patientId } = await params;
    const householdId = uuidSchema.safeParse(id);
    const patientParsed = uuidSchema.safeParse(patientId);
    if (!householdId.success) throw new AppError('Invalid household ID', 400);
    if (!patientParsed.success) throw new AppError('Invalid patient ID', 400);

    await removeFamilyPatient(user.id, householdId.data, patientParsed.data);
    after(() => processDeletionJobs().then(() => undefined));

    return NextResponse.json({ message: 'Patient removed from family' });
  } catch (error) {
    return handleError(error);
  }
}
