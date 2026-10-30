import { sql } from '@/lib/db/neon';
import { reportFileName } from '@/lib/reports/report-title';
import { CreateDocumentInput, DocumentMetadata } from '@/lib/types/document.types';
import { getActiveHouseholdId, listAccessibleDocuments } from '@/lib/households/access';

type DocumentRow = {
  id: string;
  owner_id: string;
  file_name: string;
  file_size: number | string;
  file_type: string;
  checksum_sha256?: string | null;
  r2_key: string;
  uploaded_at: Date;
  status: DocumentMetadata['status'];
  ocr_status?: DocumentMetadata['ocrStatus'] | null;
  ocr_text?: string | null;
  ai_status?: DocumentMetadata['aiStatus'] | null;
  classification?: string | null;
  extracted_data?: Record<string, unknown> | null;
  suggested_tags?: string[] | null;
  confidence_score?: number | string | null;
  is_approved: boolean;
  approved_at?: Date | null;
  approved_tags?: string[] | null;
  rejection_reason?: string | null;
};

function toDocument(row: DocumentRow): DocumentMetadata {
  return {
    id: row.id,
    _id: row.id,
    userId: row.owner_id,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    fileType: row.file_type,
    checksumSha256: row.checksum_sha256 || undefined,
    r2Key: row.r2_key,
    uploadedAt: row.uploaded_at,
    status: row.status,
    ocrStatus: row.ocr_status || undefined,
    ocrText: row.ocr_text || undefined,
    aiStatus: row.ai_status || undefined,
    classification: row.classification || undefined,
    extractedData: row.extracted_data || undefined,
    suggestedTags: row.suggested_tags || [],
    confidenceScore: row.confidence_score === null ? undefined : Number(row.confidence_score),
    isApproved: row.is_approved,
    approvedAt: row.approved_at || undefined,
    approvedTags: row.approved_tags || [],
    rejectionReason: row.rejection_reason || undefined,
  };
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentMetadata> {
  const [row] = await sql`
    INSERT INTO documents (owner_id, patient_id, file_name, file_size, file_type, r2_key, storage_provider, checksum_sha256)
    VALUES (
      ${input.userId},
      ${input.patientId ?? null}::uuid,
      ${input.fileName},
      ${input.fileSize},
      ${input.fileType},
      ${input.r2Key},
      'r2',
      ${input.checksumSha256 ?? null}
    )
    RETURNING *
  `;
  return toDocument(row as DocumentRow);
}

export async function attachDocumentToPatient(documentId: string, patientId: string): Promise<void> {
  await sql`
    UPDATE documents
    SET patient_id = ${patientId}::uuid, updated_at = NOW()
    WHERE id = ${documentId}::uuid
      AND (patient_id IS NULL OR patient_id = ${patientId}::uuid)
  `;
}

export async function findPatientDocumentByChecksum(
  patientId: string,
  checksumSha256: string,
): Promise<DocumentMetadata | null> {
  const [row] = await sql`
    SELECT d.*
    FROM documents d
    WHERE d.checksum_sha256 = ${checksumSha256}
      AND (
        d.patient_id = ${patientId}::uuid
        OR EXISTS (
          SELECT 1 FROM health_records hr
          WHERE hr.document_id = d.id AND hr.patient_id = ${patientId}::uuid
        )
      )
    ORDER BY d.uploaded_at ASC
    LIMIT 1
  `;
  return row ? toDocument(row as DocumentRow) : null;
}

type UnhashedDocument = { id: string; r2_key: string };

export async function listUnhashedPatientDocuments(
  patientId: string,
  limit = 25,
): Promise<UnhashedDocument[]> {
  const rows = await sql`
    SELECT d.id, d.r2_key
    FROM documents d
    WHERE d.checksum_sha256 IS NULL
      AND d.r2_key IS NOT NULL
      AND (
        d.patient_id = ${patientId}::uuid
        OR EXISTS (
          SELECT 1 FROM health_records hr
          WHERE hr.document_id = d.id AND hr.patient_id = ${patientId}::uuid
        )
      )
    ORDER BY d.uploaded_at ASC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({ id: String(row.id), r2_key: String(row.r2_key) }));
}

export async function countUnhashedPatientDocuments(patientId: string): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*)::int AS count
    FROM documents d
    WHERE d.checksum_sha256 IS NULL
      AND d.r2_key IS NOT NULL
      AND (
        d.patient_id = ${patientId}::uuid
        OR EXISTS (
          SELECT 1 FROM health_records hr
          WHERE hr.document_id = d.id AND hr.patient_id = ${patientId}::uuid
        )
      )
  `;
  return Number(row?.count || 0);
}

export async function saveDocumentChecksum(documentId: string, checksumSha256: string): Promise<void> {
  await sql`
    UPDATE documents
    SET checksum_sha256 = ${checksumSha256}, updated_at = NOW()
    WHERE id = ${documentId}::uuid AND checksum_sha256 IS NULL
  `;
}

export async function getDocumentById(id: string): Promise<DocumentMetadata | null> {
  const [row] = await sql`SELECT * FROM documents WHERE id = ${id}::uuid`;
  return row ? toDocument(row as DocumentRow) : null;
}

export async function listUserDocuments(userId: string): Promise<DocumentMetadata[]> {
  const activeHouseholdId = await getActiveHouseholdId(userId);
  if (!activeHouseholdId) return [];
  const rows = await listAccessibleDocuments(userId, activeHouseholdId);
  return rows.map((row) => toDocument(row as DocumentRow));
}

export async function updateDocumentStatus(
  id: string,
  updates: Partial<DocumentMetadata>
): Promise<void> {
  await sql`
    UPDATE documents SET
      status = COALESCE(${updates.status ?? null}, status),
      ocr_status = COALESCE(${updates.ocrStatus ?? null}, ocr_status),
      ocr_text = COALESCE(${updates.ocrText ?? null}, ocr_text),
      ai_status = COALESCE(${updates.aiStatus ?? null}, ai_status),
      classification = COALESCE(${updates.classification ?? null}, classification),
      extracted_data = COALESCE(${updates.extractedData === undefined ? null : JSON.stringify(updates.extractedData)}::jsonb, extracted_data),
      suggested_tags = COALESCE(${updates.suggestedTags ?? null}, suggested_tags),
      confidence_score = COALESCE(${updates.confidenceScore ?? null}, confidence_score),
      is_approved = COALESCE(${updates.isApproved ?? null}, is_approved),
      approved_at = COALESCE(${updates.approvedAt ?? null}, approved_at),
      approved_tags = COALESCE(${updates.approvedTags ?? null}, approved_tags),
      rejection_reason = COALESCE(${updates.rejectionReason ?? null}, rejection_reason),
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  if (typeof updates.ocrText === 'string' && updates.ocrText.length > 0) {
    await sql`
      UPDATE health_records
      SET ocr_text = ${updates.ocrText}
      WHERE document_id = ${id}::uuid
        AND length(${updates.ocrText}) > COALESCE(length(ocr_text), 0)
    `;
  }
}

export async function updateDocumentStorage(
  id: string,
  fileSize: number,
  fileType?: string,
): Promise<void> {
  await sql`
    UPDATE documents SET
      file_size = ${fileSize},
      file_type = COALESCE(${fileType ?? null}, file_type),
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;
}

export async function updateDocumentFileName(id: string, fileName: string): Promise<void> {
  const name = fileName.trim();
  if (!name) return;
  await sql`
    UPDATE documents SET file_name = ${name}, updated_at = NOW() WHERE id = ${id}::uuid
  `;
}

export async function getDocumentDownloadName(documentId: string): Promise<string> {
  const [row] = await sql`
    SELECT d.file_name, d.file_type, hr.record_type, hr.tags, hr.data, hr.document_date, hr.created_at
    FROM documents d
    LEFT JOIN health_records hr ON hr.document_id = d.id
    WHERE d.id = ${documentId}::uuid
    LIMIT 1
  `;
  if (!row) return 'document';
  const stored = String(row.file_name || 'document');
  if (!row.record_type) return stored;
  const name = reportFileName({
    documentDate: row.document_date,
    createdAt: row.created_at,
    recordType: String(row.record_type || 'OTHER'),
    tags: row.tags,
    data: row.data && typeof row.data === 'object' ? row.data as Record<string, unknown> : {},
    originalFileName: stored,
    mimeType: String(row.file_type || ''),
  });
  if (name && name !== stored) {
    await updateDocumentFileName(documentId, name);
  }
  return name;
}

export async function syncDocumentFileName(documentId: string): Promise<void> {
  await getDocumentDownloadName(documentId);
}

export async function deleteDocument(id: string): Promise<void> {
  await sql`DELETE FROM documents WHERE id = ${id}::uuid`;
}
