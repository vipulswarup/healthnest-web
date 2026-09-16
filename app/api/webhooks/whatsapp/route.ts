import { randomUUID } from 'crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { uploadToR2 } from '@/lib/r2';
import { createDocument } from '@/lib/services/document.service';
import { verifyUploadSignature } from '@/lib/security/file-signature';
import {
  fileInboundForPatient,
  processWhatsAppIngest,
} from '@/lib/services/whatsapp-ingest.service';
import {
  downloadMediaById,
  isWhatsAppConfigured,
  normalizeWhatsAppPhone,
  parsePatientListReplyId,
  sendPatientPickerList,
  sendWhatsAppText,
  verifyWhatsAppSignature,
} from '@/lib/whatsapp/cloud-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

type WhatsAppMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; filename?: string; mime_type?: string; caption?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL
    || process.env.APP_URL
    || 'https://www.sanovault.com';
}

async function householdOwnerId(householdId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT user_id FROM household_members
    WHERE household_id = ${householdId}::uuid
    ORDER BY joined_at ASC
    LIMIT 1
  `;
  return row?.user_id ? String(row.user_id) : null;
}

async function listHouseholdPatients(householdId: string) {
  return sql`
    SELECT p.id, p.first_name, p.last_name
    FROM patients p
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    WHERE hp.household_id = ${householdId}::uuid
    ORDER BY p.first_name ASC
  `;
}

async function stageAndAskPatient(opts: {
  waMessageId: string;
  fromPhone: string;
  householdId: string;
  documentId?: string | null;
  textBody?: string | null;
}): Promise<void> {
  const { waMessageId, fromPhone, householdId, documentId = null, textBody = null } = opts;

  const [existing] = await sql`
    SELECT id, status FROM whatsapp_inbound_messages
    WHERE wa_message_id = ${waMessageId}
    LIMIT 1
  `;
  if (existing) return;

  const [inbound] = await sql`
    INSERT INTO whatsapp_inbound_messages (
      wa_message_id, from_phone, household_id, document_id, text_body, status
    ) VALUES (
      ${waMessageId},
      ${fromPhone},
      ${householdId}::uuid,
      ${documentId}::uuid,
      ${textBody},
      'awaiting_patient'
    )
    ON CONFLICT (wa_message_id) DO NOTHING
    RETURNING id
  `;
  if (!inbound?.id) return;

  const patients = await listHouseholdPatients(householdId);
  if (patients.length === 0) {
    await sendWhatsAppText(fromPhone, 'No people are linked to this family folder yet. Add someone in SanoVault first.');
    await sql`
      UPDATE whatsapp_inbound_messages SET status = 'failed', updated_at = NOW()
      WHERE id = ${String(inbound.id)}::uuid
    `;
    return;
  }

  const ownerId = await householdOwnerId(householdId);
  if (!ownerId) {
    await sendWhatsAppText(fromPhone, 'This family folder has no members yet.');
    return;
  }

  if (patients.length === 1) {
    const patientId = String(patients[0].id);
    await fileInboundForPatient({
      inboundId: String(inbound.id),
      patientId,
      actorUserId: ownerId,
    });
    after(() => processWhatsAppIngest(String(inbound.id)));
    return;
  }

  await sendPatientPickerList(
    fromPhone,
    String(inbound.id),
    patients.map((p) => ({
      id: String(p.id),
      title: String(p.first_name || 'Person'),
      description: p.last_name ? String(p.last_name) : undefined,
    })),
    `${appOrigin()}/health-records?tag=needs_review`,
  );
}

async function handlePatientReply(fromPhone: string, replyId: string): Promise<void> {
  const parsed = parsePatientListReplyId(replyId);
  if (!parsed) {
    await sendWhatsAppText(fromPhone, 'Please choose a person from the list we sent.');
    return;
  }
  if (parsed.kind === 'open') {
    await sendWhatsAppText(fromPhone, `Open SanoVault to choose who this is for: ${parsed.url}`);
    return;
  }

  const [inbound] = await sql`
    SELECT id, household_id, status, health_record_id
    FROM whatsapp_inbound_messages
    WHERE id = ${parsed.inboundId}::uuid AND from_phone = ${fromPhone}
    LIMIT 1
  `;
  if (!inbound) {
    await sendWhatsAppText(fromPhone, 'That selection expired. Please send the report again.');
    return;
  }
  if (inbound.health_record_id) {
    await sendWhatsAppText(fromPhone, 'That report is already being filed.');
    return;
  }

  const ownerId = await householdOwnerId(String(inbound.household_id));
  if (!ownerId) return;

  try {
    await fileInboundForPatient({
      inboundId: String(inbound.id),
      patientId: parsed.patientId,
      actorUserId: ownerId,
    });
    after(() => processWhatsAppIngest(String(inbound.id)));
    await sendWhatsAppText(fromPhone, 'Got it. Filing now…');
  } catch {
    await sendWhatsAppText(fromPhone, 'We could not file that for the person you chose. Try again.');
  }
}

async function handleMediaOrText(message: WhatsAppMessage, householdId: string): Promise<void> {
  const fromPhone = normalizeWhatsAppPhone(String(message.from));
  const waMessageId = String(message.id || '');
  if (!waMessageId) return;

  const ownerId = await householdOwnerId(householdId);
  if (!ownerId) {
    await sendWhatsAppText(fromPhone, 'This family folder has no members yet.');
    return;
  }

  if (message.type === 'text' && message.text?.body?.trim()) {
    await stageAndAskPatient({
      waMessageId,
      fromPhone,
      householdId,
      textBody: message.text.body.trim(),
    });
    return;
  }

  const media = message.document || message.image;
  if (!media?.id) {
    await sendWhatsAppText(
      fromPhone,
      'Send a photo, PDF, or short text note. Then pick who it belongs to.',
    );
    return;
  }

  const bytes = await downloadMediaById(media.id);
  const mimeGuess = media.mime_type || 'application/pdf';
  const verified = verifyUploadSignature(bytes, mimeGuess);
  if (!verified) {
    await sendWhatsAppText(fromPhone, 'That file type cannot be stored. Send a PDF or photo.');
    return;
  }

  const storageKey = `${ownerId}/${randomUUID()}.${verified.extension}`;
  await uploadToR2(storageKey, bytes, verified.mimeType);
  const filename = ('filename' in media && media.filename)
    ? String(media.filename)
    : `whatsapp.${verified.extension}`;
  const document = await createDocument({
    userId: ownerId,
    fileName: filename,
    fileSize: bytes.length,
    fileType: verified.mimeType,
    r2Key: storageKey,
  });
  const documentId = document.id || document._id;
  const caption = ('caption' in media && media.caption) ? String(media.caption) : null;

  await stageAndAskPatient({
    waMessageId,
    fromPhone,
    householdId,
    documentId: documentId || null,
    textBody: caption,
  });
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ ok: false, reason: 'not_configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || '{}') as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }> }>;
  };
  const messages = payload?.entry?.flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || []) || [];

  for (const message of messages) {
    const from = message.from ? normalizeWhatsAppPhone(message.from) : '';
    if (!from) continue;

    const replyId = message.interactive?.list_reply?.id
      || message.interactive?.button_reply?.id;
    if (message.type === 'interactive' && replyId) {
      await handlePatientReply(from, replyId);
      continue;
    }

    const [map] = await sql`
      SELECT household_id, default_patient_id
      FROM whatsapp_sender_maps
      WHERE phone = ${from}
      LIMIT 1
    `;
    if (!map?.household_id) {
      await sendWhatsAppText(
        from,
        'This WhatsApp number is not linked to a SanoVault family folder yet. Open Household settings in SanoVault to link it.',
      );
      continue;
    }

    try {
      await handleMediaOrText(message, String(map.household_id));
    } catch {
      await sendWhatsAppText(
        from,
        'We could not save that. Try again, or use Add a Report in the SanoVault app.',
      );
    }
  }

  return NextResponse.json({ ok: true });
}
