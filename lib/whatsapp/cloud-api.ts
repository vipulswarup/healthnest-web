import { createHmac, timingSafeEqual } from 'crypto';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_VERIFY_TOKEN
    && process.env.WHATSAPP_ACCESS_TOKEN
    && process.env.WHATSAPP_PHONE_NUMBER_ID
    && process.env.WHATSAPP_APP_SECRET,
  );
}

/** Verify Meta X-Hub-Signature-256. Returns false if secret missing or mismatch. */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const provided = signatureHeader.slice('sha256='.length);
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Digits only, WhatsApp Cloud API style (no leading +). */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function graphFetch(path: string, init?: RequestInit) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const response = await fetch(`${GRAPH_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`WhatsApp Graph API ${path} failed (${response.status})`);
  }
  return response;
}

export async function lookupMediaUrl(mediaId: string): Promise<string> {
  const data = await graphFetch(mediaId).then((r) => r.json() as Promise<{ url?: string }>);
  if (!data.url) throw new Error('WhatsApp media URL missing');
  return data.url;
}

export async function downloadMediaById(mediaId: string): Promise<Buffer> {
  const url = await lookupMediaUrl(mediaId);
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('WhatsApp media download failed');
  return Buffer.from(await response.arrayBuffer());
}

export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  await graphFetch(`${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  }).catch(() => undefined);
}

export type PatientListRow = {
  id: string;
  title: string;
  description?: string;
};

export async function sendPatientPickerList(
  to: string,
  inboundId: string,
  patients: PatientListRow[],
  appUrl?: string,
): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const rows = patients.slice(0, 9).map((patient) => ({
    id: `in:${inboundId}:p:${patient.id}`,
    title: patient.title.slice(0, 24),
    description: patient.description?.slice(0, 72),
  }));

  if (patients.length > 9 && appUrl) {
    rows.push({
      id: `open:${appUrl}`,
      title: 'Open SanoVault',
      description: 'Choose a person in the app',
    });
  }

  await graphFetch(`${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: 'Who should this report be filed for?' },
        action: {
          button: 'Choose person',
          sections: [{ title: 'Family', rows }],
        },
      },
    }),
  });
}

export function parsePatientListReplyId(replyId: string): {
  kind: 'patient';
  inboundId: string;
  patientId: string;
} | { kind: 'open'; url: string } | null {
  if (replyId.startsWith('open:')) {
    return { kind: 'open', url: replyId.slice('open:'.length) };
  }
  const match = /^in:([0-9a-f-]{36}):p:([0-9a-f-]{36})$/i.exec(replyId);
  if (!match) return null;
  return { kind: 'patient', inboundId: match[1], patientId: match[2] };
}
