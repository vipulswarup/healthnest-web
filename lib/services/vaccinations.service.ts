import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import {
  toVaccination,
  vaccinationsForPacket,
  type Vaccination,
} from '@/lib/vaccinations/format';

export async function listVaccinations(userId: string, patientId: string): Promise<{
  vaccinations: Vaccination[];
  upcoming: Array<{ id: string; vaccineName: string; doseLabel: string; nextDueDate: string }>;
  packetLines: string[];
} | null> {
  const patient = await getAccessiblePatient(userId, patientId);
  if (!patient) return null;

  const rows = await sql`
    SELECT id, patient_id, vaccine_name, dose_label, administered_date,
           provider, lot_number, site, next_due_date, notes, created_at
    FROM vaccinations
    WHERE patient_id = ${patientId}::uuid
    ORDER BY administered_date DESC, created_at DESC
    LIMIT 100
  `;
  const vaccinations = rows.map(toVaccination);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = vaccinations
    .filter((vaccination) => vaccination.nextDueDate && vaccination.nextDueDate >= today)
    .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)))
    .map((vaccination) => ({
      id: vaccination.id,
      vaccineName: vaccination.vaccineName,
      doseLabel: vaccination.doseLabel,
      nextDueDate: vaccination.nextDueDate as string,
    }));

  return {
    vaccinations,
    upcoming,
    packetLines: vaccinationsForPacket({ vaccinations }),
  };
}

export async function createVaccination(options: {
  userId: string;
  patientId: string;
  vaccineName: string;
  doseLabel?: string;
  administeredDate: string;
  provider?: string;
  lotNumber?: string;
  site?: string;
  nextDueDate?: string | null;
  notes?: string;
}): Promise<Vaccination | null> {
  const patient = await getAccessiblePatient(options.userId, options.patientId);
  if (!patient) return null;

  const [row] = await sql`
    INSERT INTO vaccinations (
      patient_id, recorded_by, vaccine_name, dose_label, administered_date,
      provider, lot_number, site, next_due_date, notes
    ) VALUES (
      ${options.patientId}::uuid,
      ${options.userId},
      ${options.vaccineName.trim()},
      ${options.doseLabel?.trim() || null},
      ${options.administeredDate}::date,
      ${options.provider?.trim() || null},
      ${options.lotNumber?.trim() || null},
      ${options.site?.trim() || null},
      ${options.nextDueDate || null}::date,
      ${options.notes?.trim() || null}
    )
    RETURNING id, patient_id, vaccine_name, dose_label, administered_date,
              provider, lot_number, site, next_due_date, notes, created_at
  `;
  return row ? toVaccination(row) : null;
}

export async function updateVaccination(options: {
  userId: string;
  vaccinationId: string;
  vaccineName?: string;
  doseLabel?: string;
  administeredDate?: string;
  provider?: string;
  lotNumber?: string;
  site?: string;
  nextDueDate?: string | null;
  notes?: string;
}): Promise<Vaccination | null> {
  const [existing] = await sql`
    SELECT v.*
    FROM vaccinations v
    WHERE v.id = ${options.vaccinationId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${options.userId}
        WHERE hp.patient_id = v.patient_id
      )
    LIMIT 1
  `;
  if (!existing) return null;

  const [row] = await sql`
    UPDATE vaccinations SET
      vaccine_name = COALESCE(${options.vaccineName?.trim() ?? null}, vaccine_name),
      dose_label = COALESCE(${options.doseLabel?.trim() ?? null}, dose_label),
      administered_date = COALESCE(${options.administeredDate ?? null}::date, administered_date),
      provider = COALESCE(${options.provider?.trim() ?? null}, provider),
      lot_number = COALESCE(${options.lotNumber?.trim() ?? null}, lot_number),
      site = COALESCE(${options.site?.trim() ?? null}, site),
      next_due_date = CASE
        WHEN ${options.nextDueDate === null} THEN NULL
        ELSE COALESCE(${options.nextDueDate ?? null}::date, next_due_date)
      END,
      notes = COALESCE(${options.notes?.trim() ?? null}, notes),
      updated_at = NOW()
    WHERE id = ${options.vaccinationId}::uuid
    RETURNING id, patient_id, vaccine_name, dose_label, administered_date,
              provider, lot_number, site, next_due_date, notes, created_at
  `;
  return row ? toVaccination(row) : null;
}

export async function deleteVaccination(userId: string, vaccinationId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM vaccinations v
    WHERE v.id = ${vaccinationId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = v.patient_id
      )
    RETURNING id
  `;
  return rows.length > 0;
}
