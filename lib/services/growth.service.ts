import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import {
  isoDateFromUnknown,
  packetGrowthLines,
  toGrowthMeasurement,
  type GrowthMeasurement,
} from '@/lib/vitals/growth';

const HISTORY_LIMIT = 24;

export async function listGrowthHistory(userId: string, patientId: string): Promise<{
  measurements: GrowthMeasurement[];
  lines: string[];
  latest: { heightCm: number | null; weightKg: number | null; measuredAt: string | null };
  dateOfBirth: string | null;
} | null> {
  const patient = await getAccessiblePatient(userId, patientId);
  if (!patient) return null;

  const rows = await sql`
    SELECT id, patient_id, measured_at, height_cm, weight_kg, head_circum_cm, notes
    FROM growth_measurements
    WHERE patient_id = ${patientId}::uuid
    ORDER BY measured_at DESC
    LIMIT ${HISTORY_LIMIT}
  `;
  const measurements = rows.map(toGrowthMeasurement);
  const dateOfBirth = isoDateFromUnknown(patient.date_of_birth as string | Date | null | undefined);
  const latestRow = measurements[0];
  return {
    measurements,
    lines: packetGrowthLines(measurements, dateOfBirth),
    latest: {
      heightCm: latestRow?.heightCm ?? null,
      weightKg: latestRow?.weightKg ?? null,
      measuredAt: latestRow?.measuredAt ?? null,
    },
    dateOfBirth,
  };
}

export async function createGrowthMeasurement(options: {
  userId: string;
  patientId: string;
  heightCm: number | null;
  weightKg: number | null;
  headCircumCm: number | null;
  notes?: string;
  measuredAt?: Date;
}): Promise<GrowthMeasurement | null> {
  const patient = await getAccessiblePatient(options.userId, options.patientId);
  if (!patient) return null;

  const measuredAt = options.measuredAt || new Date();
  const [row] = await sql`
    INSERT INTO growth_measurements (
      patient_id, recorded_by, measured_at, height_cm, weight_kg, head_circum_cm, notes
    ) VALUES (
      ${options.patientId}::uuid,
      ${options.userId},
      ${measuredAt.toISOString()}::timestamptz,
      ${options.heightCm},
      ${options.weightKg},
      ${options.headCircumCm},
      ${options.notes || null}
    )
    RETURNING id, patient_id, measured_at, height_cm, weight_kg, head_circum_cm, notes
  `;
  return row ? toGrowthMeasurement(row) : null;
}

export async function deleteGrowthMeasurement(userId: string, measurementId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM growth_measurements gm
    WHERE gm.id = ${measurementId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = gm.patient_id
      )
    RETURNING id
  `;
  return rows.length > 0;
}
