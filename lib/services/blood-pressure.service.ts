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

export const BP_DEFAULT_HISTORY_DAYS = 8;
export const BP_MAX_HISTORY_DAYS = 365;

export async function listBloodPressureWeek(
  userId: string,
  patientId: string,
  historyDays: number = BP_DEFAULT_HISTORY_DAYS,
): Promise<{
  readings: BloodPressureReading[];
  days: BpDaySlot[];
  lines: string[];
} | null> {
  const patient = await getAccessiblePatient(userId, patientId);
  if (!patient) return null;

  const days = Math.min(Math.max(Math.trunc(historyDays) || BP_DEFAULT_HISTORY_DAYS, 1), BP_MAX_HISTORY_DAYS);
  const rows = await sql`
    SELECT id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
    FROM blood_pressure_readings
    WHERE patient_id = ${patientId}::uuid
      AND recorded_at >= (NOW() - make_interval(days => ${days}::int))
    ORDER BY recorded_at DESC
  `;
  const readings = rows.map(toBloodPressureReading);
  const slots = groupReadingsByDay(readings);
  return { readings, days: slots, lines: packetBpLines(slots) };
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

async function getEditableReading(userId: string, readingId: string) {
  const [row] = await sql`
    SELECT br.id, br.patient_id, br.vault_owned, br.source
    FROM blood_pressure_readings br
    WHERE br.id = ${readingId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = br.patient_id
      )
    LIMIT 1
  `;
  return row || null;
}

export async function updateBloodPressureReading(options: {
  userId: string;
  readingId: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  period?: BpPeriod;
  recordedAt?: Date;
}): Promise<BloodPressureReading | null> {
  const existing = await getEditableReading(options.userId, options.readingId);
  if (!existing) return null;
  const recordedAt = options.recordedAt ? options.recordedAt.toISOString() : null;
  const period = options.period ?? null;
  // An edited device reading becomes vault-owned so the next sync cannot overwrite it.
  const [row] = await sql`
    UPDATE blood_pressure_readings
    SET systolic = ${options.systolic},
        diastolic = ${options.diastolic},
        pulse = ${options.pulse},
        period = COALESCE(${period}, period),
        recorded_at = COALESCE(${recordedAt}::timestamptz, recorded_at),
        vault_owned = TRUE,
        updated_at = NOW()
    WHERE id = ${options.readingId}::uuid
    RETURNING id, patient_id, recorded_at, period, systolic, diastolic, pulse, source, external_id, vault_owned
  `;
  return row ? toBloodPressureReading(row) : null;
}

export async function deleteBloodPressureReading(userId: string, readingId: string): Promise<{ patientId: string } | null> {
  const existing = await getEditableReading(userId, readingId);
  if (!existing) return null;
  // Device readings that are not vault-owned would simply be re-imported by the next sync.
  if (existing.vault_owned === false) return null;
  await sql`DELETE FROM blood_pressure_readings WHERE id = ${readingId}::uuid`;
  return { patientId: String(existing.patient_id) };
}
