import { sql } from '@/lib/db/neon';
import { randomBytes } from 'crypto';

export function toHousehold(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toHouseholdMember(row: Record<string, unknown>) {
  return {
    householdId: row.household_id,
    userId: row.user_id,
    email: row.email || undefined,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    joinedAt: row.joined_at,
  };
}

export function toHouseholdInvite(row: Record<string, unknown>) {
  return {
    id: row.id,
    householdId: row.household_id,
    householdName: row.household_name || undefined,
    email: row.email,
    token: row.token,
    invitedBy: row.invited_by,
    invitedByName: row.invited_by_name || undefined,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/** Safe to expose to anyone holding an invite URL. */
export function toPublicHouseholdInvite(row: Record<string, unknown>) {
  return {
    householdName: row.household_name || undefined,
    invitedByName: row.invited_by_name || undefined,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export async function getHouseholdForMember(householdId: string, userId: string) {
  const [row] = await sql`
    SELECT h.*
    FROM households h
    INNER JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = ${householdId}::uuid AND hm.user_id = ${userId}
    LIMIT 1
  `;
  return row || null;
}
