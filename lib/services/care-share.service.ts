import { randomBytes } from 'crypto';
import { sql } from '@/lib/db/neon';
import { canAccessPatient } from '@/lib/households/access';
import { toCalendarDay } from '@/lib/dates/calendar-date';
import { appBaseUrl } from '@/lib/site';

export type CareShare = {
  id: string;
  token: string;
  label: string | null;
  invitedEmail: string | null;
  doctorUserId: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  createdAt: string;
  patientIds: string[];
  shareUrl: string;
};

function shareUrl(token: string) {
  return `${appBaseUrl()}/care/${token}`;
}

function mapShare(row: Record<string, unknown>, patientIds: string[]): CareShare {
  return {
    id: String(row.id),
    token: String(row.token),
    label: row.label ? String(row.label) : null,
    invitedEmail: row.invited_email ? String(row.invited_email) : null,
    doctorUserId: row.doctor_user_id ? String(row.doctor_user_id) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    lastViewedAt: row.last_viewed_at ? String(row.last_viewed_at) : null,
    viewCount: Number(row.view_count || 0),
    createdAt: String(row.created_at),
    patientIds,
    shareUrl: shareUrl(String(row.token)),
  };
}

async function patientIdsForShare(shareId: string): Promise<string[]> {
  const rows = await sql`
    SELECT patient_id FROM care_share_patients WHERE care_share_id = ${shareId}::uuid
  `;
  return rows.map((row) => String(row.patient_id));
}

export async function listCareShares(userId: string): Promise<CareShare[]> {
  const rows = await sql`
    SELECT * FROM care_shares
    WHERE created_by = ${userId}
    ORDER BY created_at DESC
  `;
  const result: CareShare[] = [];
  for (const row of rows) {
    result.push(mapShare(row, await patientIdsForShare(String(row.id))));
  }
  return result;
}

export async function createCareShare(input: {
  userId: string;
  patientIds: string[];
  label?: string | null;
  invitedEmail?: string | null;
}): Promise<CareShare> {
  const patientIds = [...new Set(input.patientIds.filter(Boolean))];
  if (!patientIds.length) throw new Error('NO_PATIENTS');
  for (const patientId of patientIds) {
    if (!(await canAccessPatient(input.userId, patientId))) throw new Error('FORBIDDEN');
  }

  const email = input.invitedEmail?.trim().toLowerCase() || null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(16).toString('base64url');
    try {
      const [created] = await sql`
        INSERT INTO care_shares (token, created_by, label, invited_email)
        VALUES (${token}, ${input.userId}, ${input.label?.trim() || null}, ${email})
        RETURNING *
      `;
      for (const patientId of patientIds) {
        await sql`
          INSERT INTO care_share_patients (care_share_id, patient_id)
          VALUES (${String(created.id)}::uuid, ${patientId}::uuid)
          ON CONFLICT DO NOTHING
        `;
      }
      return mapShare(created, patientIds);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') continue;
      throw error;
    }
  }
  throw new Error('TOKEN_CREATE_FAILED');
}

export async function updateCareSharePatients(input: {
  userId: string;
  shareId: string;
  patientIds: string[];
}): Promise<CareShare> {
  const [share] = await sql`
    SELECT * FROM care_shares
    WHERE id = ${input.shareId}::uuid AND created_by = ${input.userId} AND revoked_at IS NULL
  `;
  if (!share) throw new Error('NOT_FOUND');
  const patientIds = [...new Set(input.patientIds.filter(Boolean))];
  if (!patientIds.length) throw new Error('NO_PATIENTS');
  for (const patientId of patientIds) {
    if (!(await canAccessPatient(input.userId, patientId))) throw new Error('FORBIDDEN');
  }
  await sql`DELETE FROM care_share_patients WHERE care_share_id = ${input.shareId}::uuid`;
  for (const patientId of patientIds) {
    await sql`
      INSERT INTO care_share_patients (care_share_id, patient_id)
      VALUES (${input.shareId}::uuid, ${patientId}::uuid)
    `;
  }
  await sql`UPDATE care_shares SET updated_at = NOW() WHERE id = ${input.shareId}::uuid`;
  return mapShare(share, patientIds);
}

export async function revokeCareShare(userId: string, shareId: string): Promise<void> {
  const [row] = await sql`
    UPDATE care_shares
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE id = ${shareId}::uuid AND created_by = ${userId} AND revoked_at IS NULL
    RETURNING id
  `;
  if (!row) throw new Error('NOT_FOUND');
}

export async function getCareShareByToken(token: string): Promise<CareShare | null> {
  const [row] = await sql`
    SELECT * FROM care_shares
    WHERE token = ${token} AND revoked_at IS NULL
    LIMIT 1
  `;
  if (!row) return null;
  return mapShare(row, await patientIdsForShare(String(row.id)));
}

export async function touchCareShareView(token: string): Promise<void> {
  await sql`
    UPDATE care_shares
    SET last_viewed_at = NOW(), view_count = view_count + 1, updated_at = NOW()
    WHERE token = ${token} AND revoked_at IS NULL
  `;
}

export async function claimCareShareForDoctor(input: {
  token: string;
  userId: string;
  email: string;
}): Promise<CareShare | null> {
  const share = await getCareShareByToken(input.token);
  if (!share) return null;
  if (share.invitedEmail && share.invitedEmail !== input.email.trim().toLowerCase()) {
    throw new Error('EMAIL_MISMATCH');
  }
  const [row] = await sql`
    UPDATE care_shares
    SET doctor_user_id = ${input.userId}, updated_at = NOW()
    WHERE token = ${input.token} AND revoked_at IS NULL
    RETURNING *
  `;
  if (!row) return null;
  return mapShare(row, share.patientIds);
}

export async function listDoctorCareShares(userId: string): Promise<CareShare[]> {
  const rows = await sql`
    SELECT * FROM care_shares
    WHERE doctor_user_id = ${userId} AND revoked_at IS NULL
    ORDER BY updated_at DESC
  `;
  const result: CareShare[] = [];
  for (const row of rows) {
    result.push(mapShare(row, await patientIdsForShare(String(row.id))));
  }
  return result;
}

export type CarePatientSummary = {
  id: string;
  name: string;
  dateOfBirth: string | null;
};

export async function assertCarePatientAccess(token: string, patientId: string): Promise<{
  share: CareShare;
  patient: Record<string, unknown>;
} | null> {
  const share = await getCareShareByToken(token);
  if (!share || !share.patientIds.includes(patientId)) return null;
  const [patient] = await sql`
    SELECT * FROM patients WHERE id = ${patientId}::uuid LIMIT 1
  `;
  if (!patient) return null;
  return { share, patient };
}

export async function loadCareShareView(token: string) {
  const share = await getCareShareByToken(token);
  if (!share) return null;
  await touchCareShareView(token);

  const patients: CarePatientSummary[] = [];
  for (const patientId of share.patientIds) {
    const [patient] = await sql`
      SELECT id, first_name, last_name, date_of_birth FROM patients WHERE id = ${patientId}::uuid
    `;
    if (!patient) continue;
    patients.push({
      id: String(patient.id),
      name: [patient.first_name, patient.last_name].filter(Boolean).join(' ').trim(),
      dateOfBirth: toCalendarDay(patient.date_of_birth) || null,
    });
  }

  return {
    share: {
      label: share.label,
      viewCount: share.viewCount,
    },
    patients,
  };
}
