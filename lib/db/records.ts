import { toCalendarDay } from '@/lib/dates/calendar-date';
import { reportTitle } from '@/lib/reports/report-title';

export function toHealthRecord(row: Record<string, unknown>) {
  const data = (row.data && typeof row.data === 'object' && !Array.isArray(row.data))
    ? row.data as Record<string, unknown>
    : {};
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const documentDate = toCalendarDay(row.document_date);
  return {
    id: row.id,
    patientId: row.patient_id,
    recordType: row.record_type,
    data,
    tags,
    source: row.source,
    doctorName: row.doctor_name || undefined,
    documentDate,
    documentId: row.document_id || undefined,
    ocrText: row.ocr_text || undefined,
    hospitalSystemName: row.hospital_system_name || undefined,
    hospitalIdentifierType: row.hospital_identifier_type || undefined,
    hospitalIdentifierValue: row.hospital_identifier_value || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: reportTitle({
      documentDate,
      createdAt: row.created_at,
      recordType: String(row.record_type || ''),
      tags,
      data,
    }),
  };
}
