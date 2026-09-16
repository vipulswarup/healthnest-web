import { sql } from '@/lib/db/neon';
import { CreateDocumentInput, DocumentMetadata } from '@/lib/types/document.types';
import { getActiveHouseholdId, listAccessibleDocuments } from '@/lib/households/access';

type DocumentRow = {
  id: string;
  owner_id: string;
  file_name: string;
  file_size: number | string;
  file_type: string;
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
    INSERT INTO documents (owner_id, file_name, file_size, file_type, r2_key, storage_provider)
    VALUES (${input.userId}, ${input.fileName}, ${input.fileSize}, ${input.fileType}, ${input.r2Key}, 'r2')
    RETURNING *
  `;
  return toDocument(row as DocumentRow);
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

export async function deleteDocument(id: string): Promise<void> {
  await sql`DELETE FROM documents WHERE id = ${id}::uuid`;
}
