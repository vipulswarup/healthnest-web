import { sql } from '@/lib/db/neon';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { extractTextFromImage } from '@/lib/services/ocr.service';
import { analyzeDocument } from '@/lib/services/ai.service';
import { getAllCategories } from '@/lib/services/category.service';
import { notifyPatientHousehold } from '@/lib/services/device-push.service';
import { sendWhatsAppText } from '@/lib/whatsapp/cloud-api';

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
 * After patient pick: OCR (if media) + AI classify, enrich health_record,
 * leave document unapproved for in-app review.
 */
export async function processWhatsAppIngest(inboundId: string): Promise<void> {
  const [inbound] = await sql`
    SELECT id, from_phone, document_id, text_body, patient_id, health_record_id, status
    FROM whatsapp_inbound_messages
    WHERE id = ${inboundId}::uuid
    LIMIT 1
  `;
  if (!inbound?.health_record_id || !inbound.patient_id) return;
  if (inbound.status === 'filed') return;

  const fromPhone = String(inbound.from_phone);
  const patientId = String(inbound.patient_id);
  const healthRecordId = String(inbound.health_record_id);
  const documentId = inbound.document_id ? String(inbound.document_id) : null;
  const textBody = typeof inbound.text_body === 'string' ? inbound.text_body : null;

  try {
    let ocrText = textBody?.trim() || '';
    if (documentId) {
      const document = await getDocumentById(documentId);
      if (!document?.r2Key) throw new Error('Document missing storage key');
      await updateDocumentStatus(documentId, { ocrStatus: 'PROCESSING', aiStatus: 'PROCESSING' });
      ocrText = await extractTextFromImage(document.r2Key, true, { mode: 'intake' });
      await updateDocumentStatus(documentId, {
        ocrStatus: 'COMPLETED',
        ocrText,
      });
    }

    const analysisInput = ocrText.trim() || textBody?.trim() || 'Untitled WhatsApp note';
    const analysis = analysisInput.length < 12
      ? {
          classification: 'Other',
          confidence: 0,
          source: 'WhatsApp',
          doctorName: null as string | null,
          documentDate: null as string | null,
          idType: null as string | null,
          expiryDate: null as string | null,
          tags: [] as string[],
        }
      : await analyzeDocument(analysisInput);

    const recordType = await classificationToCode(analysis.classification);
    const tags = uniqueTags([
      'whatsapp',
      'needs_review',
      ...(analysis.tags || []),
    ]);

    const data: Record<string, unknown> = {};
    if (recordType === 'ID_DOCUMENT') {
      if (analysis.idType) data.idType = analysis.idType;
      if (analysis.expiryDate) data.expiryDate = analysis.expiryDate;
    }

    await sql`
      UPDATE health_records SET
        record_type = ${recordType},
        data = ${JSON.stringify(data)}::jsonb,
        tags = ${tags},
        source = ${analysis.source?.trim() || 'WhatsApp'},
        doctor_name = ${analysis.doctorName || null},
        document_date = ${analysis.documentDate || null}::date,
        ocr_text = ${ocrText || null},
        updated_at = NOW()
      WHERE id = ${healthRecordId}::uuid
    `;

    if (documentId) {
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
    }

    await sql`
      UPDATE whatsapp_inbound_messages
      SET status = 'filed', updated_at = NOW()
      WHERE id = ${inboundId}::uuid
    `;

    const name = await patientDisplayName(patientId);
    const categoryLabel = analysis.classification || 'Other';
    await sendWhatsAppText(
      fromPhone,
      `Saved for ${name} as ${categoryLabel}. Open SanoVault to confirm.`,
    );
    await notifyPatientHousehold(patientId, {
      title: 'WhatsApp report ready to review',
      body: `A report for ${name} needs a quick check in SanoVault.`,
      data: { patientId, recordId: healthRecordId, via: 'whatsapp' },
    }).catch(() => undefined);
  } catch {
    await sql`
      UPDATE whatsapp_inbound_messages
      SET status = 'failed', updated_at = NOW()
      WHERE id = ${inboundId}::uuid
    `;
    if (documentId) {
      await updateDocumentStatus(documentId, {
        ocrStatus: 'FAILED',
        aiStatus: 'FAILED',
      }).catch(() => undefined);
    }
    await sendWhatsAppText(
      fromPhone,
      'We saved the file, but could not finish reading it. Open SanoVault to review.',
    ).catch(() => undefined);
  }
}

export async function fileInboundForPatient(opts: {
  inboundId: string;
  patientId: string;
  actorUserId: string;
}): Promise<{ healthRecordId: string }> {
  const { inboundId, patientId, actorUserId } = opts;

  const [inbound] = await sql`
    SELECT id, household_id, document_id, text_body, status, health_record_id
    FROM whatsapp_inbound_messages
    WHERE id = ${inboundId}::uuid
    LIMIT 1
  `;
  if (!inbound) throw new Error('Inbound not found');
  if (inbound.health_record_id) {
    return { healthRecordId: String(inbound.health_record_id) };
  }
  if (inbound.status !== 'awaiting_patient' && inbound.status !== 'failed') {
    throw new Error('Inbound is not awaiting a patient');
  }

  const [linked] = await sql`
    SELECT 1 FROM household_patients
    WHERE household_id = ${String(inbound.household_id)}::uuid
      AND patient_id = ${patientId}::uuid
    LIMIT 1
  `;
  if (!linked) throw new Error('Patient not in household');

  const documentId = inbound.document_id ? String(inbound.document_id) : null;
  const textBody = typeof inbound.text_body === 'string' ? inbound.text_body : null;
  const tags = ['whatsapp', 'needs_review'];

  const [record] = await sql`
    INSERT INTO health_records (
      patient_id, record_type, data, tags, source, document_id, ocr_text
    ) VALUES (
      ${patientId}::uuid,
      'OTHER',
      '{}'::jsonb,
      ${tags},
      'WhatsApp',
      ${documentId}::uuid,
      ${textBody}
    )
    RETURNING id
  `;

  await sql`
    UPDATE whatsapp_inbound_messages SET
      status = 'processing',
      patient_id = ${patientId}::uuid,
      health_record_id = ${String(record.id)}::uuid,
      updated_at = NOW()
    WHERE id = ${inboundId}::uuid
  `;

  const { recordAuditEvent } = await import('@/lib/services/audit.service');
  await recordAuditEvent({
    actorId: actorUserId,
    patientId,
    eventType: 'created',
    entityType: 'health_record',
    entityId: String(record.id),
    metadata: { via: 'whatsapp' },
  });

  return { healthRecordId: String(record.id) };
}
