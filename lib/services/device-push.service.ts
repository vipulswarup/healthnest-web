import { sql } from '@/lib/db/neon';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function householdMemberIdsForPatient(patientId: string): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT hm.user_id
    FROM household_members hm
    INNER JOIN household_patients hp ON hp.household_id = hm.household_id
    WHERE hp.patient_id = ${patientId}::uuid
  `;
  return rows.map((row) => String(row.user_id));
}

async function householdMemberIds(householdId: string): Promise<string[]> {
  const rows = await sql`
    SELECT user_id FROM household_members WHERE household_id = ${householdId}::uuid
  `;
  return rows.map((row) => String(row.user_id));
}

export async function registerDeviceToken(options: {
  userId: string;
  platform: 'ios' | 'android';
  token: string;
}) {
  await sql`
    INSERT INTO device_tokens (user_id, platform, token, last_seen_at)
    VALUES (${options.userId}, ${options.platform}, ${options.token}, NOW())
    ON CONFLICT (user_id, token) DO UPDATE SET
      platform = EXCLUDED.platform,
      last_seen_at = NOW()
  `;
}

async function sendExpoPush(tokens: string[], payload: PushPayload) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: 'default',
  }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  }).catch(() => undefined);
}

export async function notifyUsers(userIds: string[], payload: PushPayload, exceptUserId?: string) {
  const recipients = exceptUserId ? userIds.filter((id) => id !== exceptUserId) : userIds;
  const tokens: string[] = [];
  for (const userId of recipients) {
    const rows = await sql`SELECT token FROM device_tokens WHERE user_id = ${userId}`;
    for (const row of rows) tokens.push(String(row.token));
  }
  await sendExpoPush(tokens, payload);
}

export async function notifyPatientHousehold(
  patientId: string,
  payload: PushPayload,
  exceptUserId?: string,
) {
  const members = await householdMemberIdsForPatient(patientId);
  await notifyUsers(members, payload, exceptUserId);
}

export async function notifyHousehold(
  householdId: string,
  payload: PushPayload,
  exceptUserId?: string,
) {
  const members = await householdMemberIds(householdId);
  await notifyUsers(members, payload, exceptUserId);
}
