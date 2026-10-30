import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import {
  BP_DEFAULT_HISTORY_DAYS,
  BP_MAX_HISTORY_DAYS,
} from '@/lib/services/blood-pressure.service';
import {
  groupReadingsByDay,
  packetBpLines,
  toBloodPressureReading,
} from '@/lib/vitals/blood-pressure';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    await requireCarePatient(token, patientId);

    const requestedDays = Number(request.nextUrl.searchParams.get('days'));
    const days = Math.min(
      Math.max(
        Number.isFinite(requestedDays) && requestedDays > 0
          ? Math.trunc(requestedDays)
          : BP_DEFAULT_HISTORY_DAYS,
        1,
      ),
      BP_MAX_HISTORY_DAYS,
    );

    const rows = await sql`
      SELECT id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
      FROM blood_pressure_readings
      WHERE patient_id = ${patientId}::uuid
        AND recorded_at >= (NOW() - make_interval(days => ${days}::int))
      ORDER BY recorded_at DESC
    `;
    const readings = rows.map(toBloodPressureReading);
    const slots = groupReadingsByDay(readings);
    return NextResponse.json({
      readings,
      days: slots,
      lines: packetBpLines(slots),
    }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
