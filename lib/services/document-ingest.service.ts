import { after } from 'next/server';
import { sql } from '@/lib/db/neon';
import { getDocumentById, updateDocumentStatus, syncDocumentFileName } from '@/lib/services/document.service';
import { extractDocumentText } from '@/lib/services/document-text.service';
import { analyzeDocument } from '@/lib/services/ai.service';
import { getAllCategories } from '@/lib/services/category.service';
import { notifyPatientHousehold } from '@/lib/services/device-push.service';
import { isUsefulOcrText } from '@/lib/services/ocr.service';
import { hasGroqAiConsent } from '@/lib/legal/groq-consent';

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((t) => t.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean)));
}

async function classificationToCode(displayName: string): Promise<string> {
  const categories = await getAllCategories();
  const match = categories.find(
    (cat) => cat.displayName.toLowerCase() === displayName.trim().toLowerCase(),
  );
  return match?.code || 'OTHER';
}

async function patientDisplayName(patientId: string): Promise<string> {
  const [row] = await sql`
    SELECT first_name, last_name FROM patients WHERE id = ${patientId}::uuid LIMIT 1
  `;
  if (!row) return 'this person';
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || 'this person';
}

/**
 * OCR + classify a filed health record in the background.
 * Leaves needs_review so the family can confirm in-app.
 */
export async function processHealthRecordDocument(opts: {
  healthRecordId: string;
  documentId: string;
  sourceFallback?: string;
  keepTags?: string[];
}): Promise<void> {
  const { healthRecordId, documentId, sourceFallback = 'Share', keepTags = ['needs_review'] } = opts;

  const [record] = await sql`
    SELECT id, patient_id, tags, data FROM health_records WHERE id = ${healthRecordId}::uuid LIMIT 1
  `;
  if (!record) return;

  const patientId = String(record.patient_id);
  const existingTags = Array.isArray(record.tags) ? record.tags.map(String) : [];

  try {
    const document = await getDocumentById(documentId);
    if (!document?.r2Key) throw new Error('Document missing storage key');

    const [owner] = await sql`
      SELECT COALESCE(d.owner_id, p.owner_id) AS consent_owner
      FROM documents d LEFT JOIN patients p ON p.id = d.patient_id
      WHERE d.id = ${documentId}::uuid LIMIT 1
    `;
    const consentOwner = String(owner?.consent_owner || '');
    if (!consentOwner || !await hasGroqAiConsent(consentOwner)) {
      return;
    }

    await updateDocumentStatus(documentId, { ocrStatus: 'PROCESSING', aiStatus: 'PROCESSING' });
    const ocrText = await extractDocumentText({
      r2Key: document.r2Key,
      fileType: document.fileType,
      fileName: document.fileName,
      patientId,
      actorUserId: consentOwner,
    });
    await updateDocumentStatus(documentId, { ocrStatus: 'COMPLETED', ocrText });

    const analysisInput = ocrText.trim();
    const analysis = !isUsefulOcrText(analysisInput)
      ? {
          classification: 'Other',
          confidence: 0,
          source: sourceFallback,
          doctorName: null as string | null,
          documentDate: null as string | null,
          idType: null as string | null,
          expiryDate: null as string | null,
          testType: null as string | null,
          testTypes: [] as string[],
          bodyPart: null as string | null,
          tags: [] as string[],
        }
      : await analyzeDocument(analysisInput);

    const recordType = await classificationToCode(analysis.classification);
    const tags = uniqueTags([
      ...keepTags,
      ...existingTags,
      ...(analysis.tags || []),
    ]);

    const existingData = record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? record.data as Record<string, unknown>
      : {};
    const data: Record<string, unknown> = { ...existingData };
    if (analysis.testType) data.testType = analysis.testType;
    if (analysis.testTypes?.length) data.testTypes = analysis.testTypes;
    if (analysis.bodyPart) data.bodyPart = analysis.bodyPart;
    if (recordType === 'ID_DOCUMENT') {
      if (analysis.idType) data.idType = analysis.idType;
      if (analysis.expiryDate) data.expiryDate = analysis.expiryDate;
    }

    await sql`
      UPDATE health_records SET
        record_type = ${recordType},
        data = ${JSON.stringify(data)}::jsonb,
        tags = ${tags},
        source = ${analysis.source?.trim() || sourceFallback},
        doctor_name = ${analysis.doctorName || null},
        document_date = ${analysis.documentDate || null}::date,
        ocr_text = ${ocrText || null},
        updated_at = NOW()
      WHERE id = ${healthRecordId}::uuid
    `;

    await updateDocumentStatus(documentId, {
      aiStatus: 'COMPLETED',
      classification: analysis.classification,
      confidenceScore: analysis.confidence,
      suggestedTags: tags,
      extractedData: {
        source: analysis.source,
        doctorName: analysis.doctorName,
        documentDate: analysis.documentDate,
        idType: analysis.idType,
        expiryDate: analysis.expiryDate,
      },
      isApproved: false,
      status: 'COMPLETED',
    });

    await syncDocumentFileName(documentId).catch(() => undefined);

    const name = await patientDisplayName(patientId);
    await notifyPatientHousehold(patientId, {
      title: 'Shared report ready to review',
      body: `A report for ${name} needs a quick check in SanoVault.`,
      data: { patientId, recordId: healthRecordId, via: 'share' },
    }).catch(() => undefined);
  } catch {
    await updateDocumentStatus(documentId, {
      ocrStatus: 'FAILED',
      aiStatus: 'FAILED',
    }).catch(() => undefined);
  }
}

/** Schedule OCR/AI enrichment after the HTTP response returns. */
export function scheduleHealthRecordProcessing(opts: {
  healthRecordId: string;
  documentId: string;
  sourceFallback?: string;
  keepTags?: string[];
}): void {
  after(() => processHealthRecordDocument(opts));
}
