import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import {
  toVisitNote,
  visitNotesForPacket,
  type VisitNote,
} from '@/lib/visit-notes/format';

export async function listVisitNotes(userId: string, patientId: string): Promise<{
  notes: VisitNote[];
  nextAppointment: string | null;
  packetLines: string[];
} | null> {
  const row = await getAccessiblePatient(userId, patientId);
  if (!row) return null;

  const preferences = (row.preferences && typeof row.preferences === 'object')
    ? row.preferences as Record<string, unknown>
    : {};
  const nextAppointment = typeof preferences.nextAppointmentDate === 'string'
    ? preferences.nextAppointmentDate.slice(0, 10)
    : null;
  const legacyPleaseAsk = typeof preferences.pleaseAsk === 'string' ? preferences.pleaseAsk : '';

  const rows = await sql`
    SELECT id, patient_id, note_date, observed, ask_doctor, pinned, created_at
    FROM visit_notes
    WHERE patient_id = ${patientId}::uuid
    ORDER BY pinned DESC, note_date DESC, created_at DESC
    LIMIT 50
  `;
  const notes = rows.map(toVisitNote);
  return {
    notes,
    nextAppointment,
    packetLines: visitNotesForPacket({ notes, nextAppointment, legacyPleaseAsk }),
  };
}

export async function createVisitNote(options: {
  userId: string;
  patientId: string;
  noteDate: string;
  observed: string;
  askDoctor: string;
  pinned?: boolean;
}): Promise<VisitNote | null> {
  const patient = await getAccessiblePatient(options.userId, options.patientId);
  if (!patient) return null;

  if (options.pinned) {
    await sql`
      UPDATE visit_notes SET pinned = FALSE, updated_at = NOW()
      WHERE patient_id = ${options.patientId}::uuid AND pinned = TRUE
    `;
  }

  const [row] = await sql`
    INSERT INTO visit_notes (patient_id, recorded_by, note_date, observed, ask_doctor, pinned)
    VALUES (
      ${options.patientId}::uuid,
      ${options.userId},
      ${options.noteDate}::date,
      ${options.observed},
      ${options.askDoctor},
      ${Boolean(options.pinned)}
    )
    RETURNING id, patient_id, note_date, observed, ask_doctor, pinned, created_at
  `;
  return row ? toVisitNote(row) : null;
}

export async function updateVisitNote(options: {
  userId: string;
  noteId: string;
  pinned?: boolean;
  observed?: string;
  askDoctor?: string;
  noteDate?: string;
}): Promise<VisitNote | null> {
  const [existing] = await sql`
    SELECT vn.*
    FROM visit_notes vn
    WHERE vn.id = ${options.noteId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${options.userId}
        WHERE hp.patient_id = vn.patient_id
      )
    LIMIT 1
  `;
  if (!existing) return null;

  if (options.pinned) {
    await sql`
      UPDATE visit_notes SET pinned = FALSE, updated_at = NOW()
      WHERE patient_id = ${existing.patient_id}::uuid AND pinned = TRUE AND id <> ${options.noteId}::uuid
    `;
  }

  const [row] = await sql`
    UPDATE visit_notes SET
      pinned = COALESCE(${options.pinned ?? null}, pinned),
      observed = COALESCE(${options.observed ?? null}, observed),
      ask_doctor = COALESCE(${options.askDoctor ?? null}, ask_doctor),
      note_date = COALESCE(${options.noteDate ?? null}::date, note_date),
      updated_at = NOW()
    WHERE id = ${options.noteId}::uuid
    RETURNING id, patient_id, note_date, observed, ask_doctor, pinned, created_at
  `;
  return row ? toVisitNote(row) : null;
}

export async function deleteVisitNote(userId: string, noteId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM visit_notes vn
    WHERE vn.id = ${noteId}::uuid
      AND EXISTS (
        SELECT 1 FROM household_patients hp
        INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = vn.patient_id
      )
    RETURNING id
  `;
  return rows.length > 0;
}

export { visitNotesForPacket };
