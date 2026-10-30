import { NextRequest, NextResponse } from 'next/server';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { loadPatientOverview } from '@/lib/patients/load-overview';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    const { patient } = await requireCarePatient(token, patientId);
    const { overview } = await loadPatientOverview(patient);
    return NextResponse.json(overview, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
