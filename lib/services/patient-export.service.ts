import JSZip from 'jszip';
import { sql } from '@/lib/db/neon';
import { canAccessPatient } from '@/lib/households/access';
import { toCalendarDay } from '@/lib/dates/calendar-date';
import { reportTitle, safeDownloadFileName } from '@/lib/reports/report-title';
import { getR2Object } from '@/lib/r2';

export async function buildPatientExportZip(userId: string, patientId: string): Promise<{
  filename: string;
  bytes: Buffer;
}> {
  if (!(await canAccessPatient(userId, patientId))) throw new Error('FORBIDDEN');

  const [patient] = await sql`
    SELECT id, first_name, last_name, date_of_birth, gender, blood_group
    FROM patients WHERE id = ${patientId}::uuid
  `;
  if (!patient) throw new Error('NOT_FOUND');

  const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim() || 'patient';
  const records = await sql`
    SELECT hr.*, d.r2_key, d.file_name, d.file_type
    FROM health_records hr
    LEFT JOIN documents d ON d.id = hr.document_id
    WHERE hr.patient_id = ${patientId}::uuid
    ORDER BY COALESCE(hr.document_date, hr.created_at::date) DESC, hr.created_at DESC
  `;

  const metadata = {
    exportedAt: new Date().toISOString(),
    patient: {
      id: String(patient.id),
      name,
      dateOfBirth: toCalendarDay(patient.date_of_birth) || null,
      gender: patient.gender ? String(patient.gender) : null,
      bloodGroup: patient.blood_group ? String(patient.blood_group) : null,
    },
    records: records.map((row) => {
      const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? row.data as Record<string, unknown>
        : {};
      const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
      return {
        id: String(row.id),
        recordType: String(row.record_type || ''),
        source: String(row.source || ''),
        doctorName: row.doctor_name ? String(row.doctor_name) : null,
        documentDate: toCalendarDay(row.document_date) || null,
        tags,
        title: reportTitle({
          documentDate: row.document_date,
          createdAt: row.created_at,
          recordType: String(row.record_type || ''),
          tags,
          data,
        }),
        documentId: row.document_id ? String(row.document_id) : null,
        fileName: row.file_name ? String(row.file_name) : null,
      };
    }),
  };

  const zip = new JSZip();
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  const files = zip.folder('files');

  for (const row of records) {
    if (!row.r2_key || !files) continue;
    try {
      const body = await getR2Object(String(row.r2_key));
      if (!body) continue;
      const buffer = Buffer.from(await body.transformToByteArray());
      const title = reportTitle({
        documentDate: row.document_date,
        createdAt: row.created_at,
        recordType: String(row.record_type || ''),
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
        data: row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? row.data as Record<string, unknown>
          : {},
      });
      const ext = String(row.file_name || '').includes('.')
        ? `.${String(row.file_name).split('.').pop()}`
        : '.pdf';
      files.file(safeDownloadFileName(`${title}${ext}`), buffer);
    } catch {
      // Skip missing/unavailable files; metadata still lists them.
    }
  }

  const bytes = Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
  return {
    filename: safeDownloadFileName(`${name}-sanovault-export.zip`),
    bytes,
  };
}
