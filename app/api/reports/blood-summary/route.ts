import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { getAccessiblePatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { loadBloodSummaryForPatient } from '@/lib/reports/load-blood-summary';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = new URL(request.url).searchParams.get('patientId');
    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }

    const patient = await getAccessiblePatient(user.id, patientId);
    if (!patient) throw new AppError('Patient not found', 404);

    const summary = await loadBloodSummaryForPatient(patientId);

    return NextResponse.json({
      patient: {
        id: String(patient.id),
        firstName: String(patient.first_name || ''),
        lastName: String(patient.last_name || ''),
      },
      ...summary,
    });
  } catch (error) {
    return handleError(error);
  }
}
