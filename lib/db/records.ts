export function toHealthRecord(row: Record<string, unknown>) {
  return {
    id: row.id,
    patientId: row.patient_id,
    recordType: row.record_type,
    data: row.data || {},
    tags: row.tags || [],
    source: row.source,
    doctorName: row.doctor_name || undefined,
    documentDate: row.document_date || undefined,
    documentId: row.document_id || undefined,
    ocrText: row.ocr_text || undefined,
    hospitalSystemName: row.hospital_system_name || undefined,
    hospitalIdentifierType: row.hospital_identifier_type || undefined,
    hospitalIdentifierValue: row.hospital_identifier_value || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
