import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { isHouseholdMember, unlinkPatientFromHousehold } from '@/lib/households/access';
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

    if (!(await isHouseholdMember(user.id, householdId.data))) {
      throw new AppError('Household not found', 404);
    }

    const result = await unlinkPatientFromHousehold(householdId.data, patientParsed.data);
    if (!result.ok) {
      if (result.reason === 'ORPHAN') {
        throw new AppError(
          'Cannot unlink: this is the patient\'s only household. Link them to another household first, or delete the patient.',
          400,
          'ORPHAN_PATIENT'
        );
      }
      throw new AppError('Patient is not in this household', 404);
    }

    return NextResponse.json({ message: 'Patient unlinked' });
  } catch (error) {
    return handleError(error);
  }
}
