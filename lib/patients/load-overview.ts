import { sql } from '@/lib/db/neon';
import { buildPatientOverview, type PatientOverview } from './overview';
import { validatePractitionerSummary } from '@/lib/reports/practitioner-summary';

export function savedCaseSummary(row: Record<string, unknown> | undefined, sourceHash: string): PatientOverview['caseSummary'] {
  if (!row?.summary || !row.generated_at) return null;
  try {
    return { text: validatePractitionerSummary(row.summary), generatedAt: new Date(String(row.generated_at)).toISOString(), stale: row.source_hash !== sourceHash };
  } catch { return null; }
}

// Call only after the route has checked access to this patient.
export async function loadPatientOverview(patient: Record<string, unknown>) {
  const id = String(patient.id);
  const [records, medications, notes, cached] = await Promise.all([
    sql`
      SELECT hr.id, hr.record_type, hr.source, hr.doctor_name, hr.document_date,
        hr.created_at, hr.tags, hr.data,
        COALESCE(NULLIF(hr.ocr_text, ''), d.ocr_text) AS ocr_text
      FROM health_records hr LEFT JOIN documents d ON d.id = hr.document_id
      WHERE hr.patient_id = ${id}::uuid
    `,
    sql`SELECT id, name, dosage, frequency, route, start_date, end_date, is_active,
      indication, stopped_reason, instructions FROM medications WHERE patient_id = ${id}::uuid`,
    sql`SELECT id, note_date, observed, ask_doctor FROM visit_notes WHERE patient_id = ${id}::uuid`,
    sql`SELECT source_hash, summary, generated_at FROM patient_case_summaries WHERE patient_id = ${id}::uuid`,
  ]);
  const built = buildPatientOverview(patient, records, medications, notes);
  return { ...built, overview: { ...built.overview, caseSummary: savedCaseSummary(cached[0], built.sourceHash) } };
}
