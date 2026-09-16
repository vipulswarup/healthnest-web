import { sql } from '@/lib/db/neon';

export type ActiveHouseholdId = string;
export type DatabaseRow = Record<string, unknown>;

/** Accessible if user is a member of any household linked to the patient. */
export async function canAccessPatient(userId: string, patientId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1
    FROM household_patients hp
    INNER JOIN household_members hm
      ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
    WHERE hp.patient_id = ${patientId}::uuid
    LIMIT 1
  `;
  return Boolean(row);
}

export async function getAccessiblePatient(
  userId: string,
  patientId: string
): Promise<DatabaseRow | null> {
  const [row] = await sql`
    SELECT p.*
    FROM patients p
    WHERE p.id = ${patientId}::uuid
      AND EXISTS (
        SELECT 1
        FROM household_patients hp
        INNER JOIN household_members hm
          ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = p.id
      )
    LIMIT 1
  `;
  return row || null;
}

export async function isHouseholdMember(userId: string, householdId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM household_members
    WHERE household_id = ${householdId}::uuid AND user_id = ${userId}
    LIMIT 1
  `;
  return Boolean(row);
}

/** Resolve active household: stored preference if valid, else first membership. */
export async function getActiveHouseholdId(userId: string): Promise<ActiveHouseholdId | null> {
  const [row] = await sql`
    WITH memberships AS (
      SELECT household_id, joined_at
      FROM household_members
      WHERE user_id = ${userId}
    )
    SELECT COALESCE(
      (
        SELECT m.household_id
        FROM memberships m
        INNER JOIN profiles p ON p.user_id = ${userId}
        WHERE m.household_id::text = p.preferences->>'activeHouseholdId'
        LIMIT 1
      ),
      (
        SELECT household_id
        FROM memberships
        ORDER BY joined_at ASC
        LIMIT 1
      )
    ) AS household_id
  `;
  return row?.household_id ? String(row.household_id) : null;
}

export async function requireActiveHouseholdId(userId: string): Promise<ActiveHouseholdId> {
  const id = await getActiveHouseholdId(userId);
  if (!id) throw new Error('NO_HOUSEHOLD');
  return id;
}

export async function setActiveHouseholdId(userId: string, householdId: string): Promise<void> {
  const member = await isHouseholdMember(userId, householdId);
  if (!member) throw new Error('NOT_HOUSEHOLD_MEMBER');
  await sql`
    UPDATE profiles
    SET
      preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{activeHouseholdId}',
        ${JSON.stringify(householdId)}::jsonb,
        true
      ),
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

export async function listPatientsForContext(
  userId: string,
  activeHouseholdId: ActiveHouseholdId
): Promise<DatabaseRow[]> {
  const member = await isHouseholdMember(userId, activeHouseholdId);
  if (!member) return [];
  return sql`
    SELECT p.*
    FROM patients p
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    WHERE hp.household_id = ${activeHouseholdId}::uuid
    ORDER BY p.created_at DESC
  `;
}

/** Patients the user can access via any household membership. */
export async function listAccessiblePatients(userId: string): Promise<DatabaseRow[]> {
  return sql`
    SELECT DISTINCT ON (p.id) p.*
    FROM patients p
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    INNER JOIN household_members hm ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
    ORDER BY p.id, p.created_at DESC
  `;
}

export async function listHouseholdPatients(
  userId: string,
  householdId: string
): Promise<DatabaseRow[]> {
  if (!(await isHouseholdMember(userId, householdId))) return [];
  return sql`
    SELECT p.*
    FROM patients p
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    WHERE hp.household_id = ${householdId}::uuid
    ORDER BY p.created_at DESC
  `;
}

export async function linkPatientToHousehold(
  householdId: string,
  patientId: string
): Promise<void> {
  await sql`
    INSERT INTO household_patients (household_id, patient_id)
    VALUES (${householdId}::uuid, ${patientId}::uuid)
    ON CONFLICT DO NOTHING
  `;
}

export async function unlinkPatientFromHousehold(
  householdId: string,
  patientId: string
): Promise<{ ok: true } | { ok: false; reason: 'ORPHAN' | 'NOT_LINKED' }> {
  const [link] = await sql`
    SELECT 1 FROM household_patients
    WHERE household_id = ${householdId}::uuid AND patient_id = ${patientId}::uuid
    LIMIT 1
  `;
  if (!link) return { ok: false, reason: 'NOT_LINKED' };

  const others = await sql`
    SELECT household_id FROM household_patients
    WHERE patient_id = ${patientId}::uuid AND household_id <> ${householdId}::uuid
    LIMIT 1
  `;
  if (others.length === 0) return { ok: false, reason: 'ORPHAN' };

  await sql`
    DELETE FROM household_patients
    WHERE household_id = ${householdId}::uuid AND patient_id = ${patientId}::uuid
  `;
  return { ok: true };
}

/** Patients that would have zero households if this household were removed. */
export async function listOrphanRiskPatients(householdId: string): Promise<DatabaseRow[]> {
  return sql`
    SELECT p.id, p.first_name, p.last_name
    FROM patients p
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    WHERE hp.household_id = ${householdId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM household_patients hp2
        WHERE hp2.patient_id = p.id AND hp2.household_id <> ${householdId}::uuid
      )
    ORDER BY p.first_name ASC
  `;
}

export async function canAccessDocument(userId: string, documentId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1
    FROM documents d
    LEFT JOIN patients p ON p.id = d.patient_id
    LEFT JOIN health_records hr ON hr.document_id = d.id
    WHERE d.id = ${documentId}::uuid
      AND (
        d.owner_id = ${userId}
        OR (
          p.id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM household_patients hp
            INNER JOIN household_members hm
              ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
            WHERE hp.patient_id = p.id
          )
        )
        OR (
          hr.patient_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM household_patients hp
            INNER JOIN household_members hm
              ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
            WHERE hp.patient_id = hr.patient_id
          )
        )
      )
    LIMIT 1
  `;
  return Boolean(row);
}

export async function getAccessibleDocument(
  userId: string,
  documentId: string
): Promise<DatabaseRow | null> {
  const [row] = await sql`
    SELECT d.*
    FROM documents d
    LEFT JOIN patients p ON p.id = d.patient_id
    LEFT JOIN health_records hr ON hr.document_id = d.id
    WHERE d.id = ${documentId}::uuid
      AND (
        d.owner_id = ${userId}
        OR (
          p.id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM household_patients hp
            INNER JOIN household_members hm
              ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
            WHERE hp.patient_id = p.id
          )
        )
        OR (
          hr.patient_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM household_patients hp
            INNER JOIN household_members hm
              ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
            WHERE hp.patient_id = hr.patient_id
          )
        )
      )
    LIMIT 1
  `;
  return row || null;
}

export async function listAccessibleDocuments(
  userId: string,
  activeHouseholdId: ActiveHouseholdId
): Promise<DatabaseRow[]> {
  if (!(await isHouseholdMember(userId, activeHouseholdId))) return [];
  return sql`
    SELECT d.*
    FROM documents d
    INNER JOIN patients p ON p.id = d.patient_id
    INNER JOIN household_patients hp ON hp.patient_id = p.id
    WHERE hp.household_id = ${activeHouseholdId}::uuid
    ORDER BY d.uploaded_at DESC
  `;
}

/**
 * Dissolve household when empty of members.
 * Caller must already have checked orphan risk and removed members.
 */
export async function dissolveHouseholdIfEmpty(householdId: string): Promise<boolean> {
  const members = await sql`
    SELECT user_id FROM household_members WHERE household_id = ${householdId}::uuid
  `;
  if (members.length > 0) return false;

  const orphans = await listOrphanRiskPatients(householdId);
  if (orphans.length > 0) {
    throw new Error('ORPHAN_PATIENTS');
  }

  await sql`DELETE FROM household_patients WHERE household_id = ${householdId}::uuid`;
  await sql`DELETE FROM household_invites WHERE household_id = ${householdId}::uuid`;
  await sql`DELETE FROM households WHERE id = ${householdId}::uuid`;
  return true;
}

export async function assertCanDissolveOrLeave(householdId: string): Promise<void> {
  const orphans = await listOrphanRiskPatients(householdId);
  if (orphans.length > 0) {
    const err = new Error('ORPHAN_PATIENTS') as Error & { patients: DatabaseRow[] };
    err.patients = orphans;
    throw err;
  }
}
