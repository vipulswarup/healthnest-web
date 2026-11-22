import { sql } from "@/lib/db/neon";
import { getActiveHouseholdId } from "@/lib/households/access";
import { GoogleAuth } from "google-auth-library";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function householdMemberIdsForPatient(
  patientId: string,
): Promise<string[]> {
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
  platform: "ios" | "android";
  token: string;
  provider: "expo" | "fcm";
}) {
  await sql`
    INSERT INTO device_tokens (user_id, platform, token, provider, last_seen_at)
    VALUES (${options.userId}, ${options.platform}, ${options.token}, ${options.provider}, NOW())
    ON CONFLICT (user_id, token) DO UPDATE SET
      platform = EXCLUDED.platform,
      provider = EXCLUDED.provider,
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
    sound: "default",
  }));
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  }).catch(() => undefined);
}

let googleAuth: GoogleAuth | null = null;
async function sendFcmPush(
  token: string,
  platform: "ios" | "android",
  payload: PushPayload,
  needsReviewCount: number,
) {
  const rawCredentials = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    console.error("[push-debug] FCM credentials are not configured");
    return;
  }
  const credentials = JSON.parse(rawCredentials) as { project_id?: string };
  if (!credentials.project_id)
    throw new Error("FCM service account has no project_id");
  googleAuth ??= new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await googleAuth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) throw new Error("Could not get FCM access token");
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            ...(payload.data || {}),
            needsReviewCount: String(needsReviewCount),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "sanovault_alerts",
              notificationCount: needsReviewCount,
            },
          },
          ...(platform === "ios"
            ? {
                apns: {
                  payload: {
                    aps: { sound: "default", badge: needsReviewCount },
                  },
                },
              }
            : {}),
        },
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 404 || body.includes("UNREGISTERED")) {
      await sql`DELETE FROM device_tokens WHERE token = ${token}`;
      console.warn("[push-debug] FCM rejected an unregistered device token", {
        platform,
        httpStatus: response.status,
      });
      return;
    }
    const fcmStatus = body.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1];
    console.error("[push-debug] FCM send was rejected", {
      platform,
      httpStatus: response.status,
      ...(fcmStatus ? { fcmStatus } : {}),
    });
    throw new Error(`FCM send failed (${response.status})`);
  }
  console.info("[push-debug] FCM accepted a message", { platform });
}

export async function notifyUsers(
  userIds: string[],
  payload: PushPayload,
  exceptUserId?: string,
) {
  const recipients = exceptUserId
    ? userIds.filter((id) => id !== exceptUserId)
    : userIds;
  const tokens: string[] = [];
  for (const userId of recipients) {
    const rows =
      await sql`SELECT token, platform, provider FROM device_tokens WHERE user_id = ${userId}`;
    let needsReviewCount: number | undefined;
    for (const row of rows) {
      if (row.provider === "fcm") {
        if (needsReviewCount === undefined) {
          const householdId = await getActiveHouseholdId(userId);
          if (!householdId) {
            needsReviewCount = 0;
          } else {
            const [countRow] = await sql`
              SELECT COUNT(*)::int AS count
              FROM health_records hr
              INNER JOIN household_patients hp ON hp.patient_id = hr.patient_id
              WHERE hp.household_id = ${householdId}::uuid
                AND 'needs_review' = ANY(hr.tags)
            `;
            needsReviewCount = Number(countRow?.count || 0);
          }
        }
        await sendFcmPush(
          String(row.token),
          row.platform as "ios" | "android",
          payload,
          needsReviewCount,
        ).catch((error: unknown) => {
          console.error("[push-debug] FCM send failed before acceptance", {
            platform: row.platform,
            errorType: error instanceof Error ? error.name : typeof error,
          });
        });
      } else {
        tokens.push(String(row.token));
      }
    }
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
