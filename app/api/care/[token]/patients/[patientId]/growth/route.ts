import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import {
  isoDateFromUnknown,
  packetGrowthLines,
  toGrowthMeasurement,
} from '@/lib/vitals/growth';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    const { patient } = await requireCarePatient(token, patientId);

    const rows = await sql`
      SELECT id, patient_id, measured_at, height_cm, weight_kg, head_circum_cm, notes
      FROM growth_measurements
      WHERE patient_id = ${patientId}::uuid
      ORDER BY measured_at DESC
      LIMIT 24
    `;
    const measurements = rows.map(toGrowthMeasurement);
    const dateOfBirth = isoDateFromUnknown(patient.date_of_birth as string | Date | null | undefined);
    const latestRow = measurements[0];
    return NextResponse.json({
      measurements,
      lines: packetGrowthLines(measurements, dateOfBirth),
      latest: {
        heightCm: latestRow?.heightCm ?? null,
        weightKg: latestRow?.weightKg ?? null,
        measuredAt: latestRow?.measuredAt ?? null,
      },
      dateOfBirth,
    }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
