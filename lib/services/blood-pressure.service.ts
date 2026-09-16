import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import {
  groupReadingsByDay,
  packetBpLines,
  toBloodPressureReading,
  type BloodPressureReading,
  type BpDaySlot,
  type BpPeriod,
} from '@/lib/vitals/blood-pressure';

export async function listBloodPressureWeek(userId: string, patientId: string): Promise<{
  readings: BloodPressureReading[];
  days: BpDaySlot[];
  lines: string[];
} | null> {
  const patient = await getAccessiblePatient(userId, patientId);
  if (!patient) return null;

  const rows = await sql`
    SELECT id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
    FROM blood_pressure_readings
    WHERE patient_id = ${patientId}::uuid
      AND recorded_at >= (NOW() - INTERVAL '8 days')
    ORDER BY recorded_at DESC
  `;
  const readings = rows.map(toBloodPressureReading);
  const days = groupReadingsByDay(readings);
  return { readings, days, lines: packetBpLines(days) };
}

export async function createBloodPressureReading(options: {
  userId: string;
  patientId: string;
  period: BpPeriod;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  recordedAt?: Date;
  source?: 'sanovault' | 'healthkit' | 'health_connect';
  externalId?: string | null;
  vaultOwned?: boolean;
}): Promise<BloodPressureReading | null> {
  const patient = await getAccessiblePatient(options.userId, options.patientId);
  if (!patient) return null;

  const recordedAt = options.recordedAt || new Date();
  const source = options.source || 'sanovault';
  const vaultOwned = options.vaultOwned ?? source === 'sanovault';
  const [row] = await sql`
    INSERT INTO blood_pressure_readings (
      patient_id, recorded_by, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned, updated_at
    )
    VALUES (
      ${options.patientId}::uuid,
      ${options.userId},
      ${recordedAt.toISOString()}::timestamptz,
      ${options.period},
      ${options.systolic},
      ${options.diastolic},
      ${options.pulse},
      ${source},
      ${options.externalId || null},
      ${vaultOwned},
      NOW()
    )
    RETURNING id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
  `;
  return row ? toBloodPressureReading(row) : null;
}

export async function syncBloodPressureFromHealth(options: {
  userId: string;
  patientId: string;
  period: BpPeriod;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  recordedAt: Date;
  source: 'healthkit' | 'health_connect';
  externalId: string;
}): Promise<{ reading: BloodPressureReading; skipped: boolean } | null> {
  const patient = await getAccessiblePatient(options.userId, options.patientId);
  if (!patient) return null;

  const [existing] = await sql`
    SELECT id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
    FROM blood_pressure_readings
    WHERE patient_id = ${options.patientId}::uuid
      AND source = ${options.source}
      AND external_id = ${options.externalId}
    LIMIT 1
  `;
  if (existing) {
    if (existing.vault_owned) {
      return { reading: toBloodPressureReading(existing), skipped: true };
    }
    const [row] = await sql`
      UPDATE blood_pressure_readings
      SET systolic = ${options.systolic},
          diastolic = ${options.diastolic},
          pulse = ${options.pulse},
          period = ${options.period},
          recorded_at = ${options.recordedAt.toISOString()}::timestamptz,
          updated_at = NOW()
      WHERE id = ${existing.id}::uuid
      RETURNING id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
    `;
    return row ? { reading: toBloodPressureReading(row), skipped: false } : null;
  }

  const reading = await createBloodPressureReading({
    ...options,
    vaultOwned: false,
  });
  return reading ? { reading, skipped: false } : null;
}
