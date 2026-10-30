import { sql } from '@/lib/db/neon';
import { deleteFromR2 } from '@/lib/r2';
import { AppError } from '@/lib/middleware/error-handler';
import { decryptSecret } from '@/lib/security/secret-box';
import { revokeAppleToken } from '@/lib/auth/apple';

export function requireIdentityDeletionConfiguration(userId: string) {
  if (!userId.startsWith('apple:') && (!process.env.NEON_API_KEY || !process.env.NEON_PROJECT_ID || !process.env.NEON_BRANCH_ID)) {
    throw new AppError('Automatic account deletion is temporarily unavailable. Request deletion at support@eisenvault.com.', 503);
  }
}

export async function removeFamilyPatient(actor: string, family: string, person: string) {
  try { await sql`SELECT remove_family_patient(${actor}, ${family}::uuid, ${person}::uuid)`; }
  catch (error) { throw deletionError(error); }
}

export async function eraseFamily(actor: string, family: string) {
  try { await sql`SELECT erase_family(${actor}, ${family}::uuid)`; }
  catch (error) { throw deletionError(error); }
}

function deletionError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('FAMILY_OWNER_REQUIRED')) return new AppError('Only the family creator can delete this family.', 403);
  if (message.includes('FAMILY_NOT_FOUND')) return new AppError('Family not found', 404);
  if (message.includes('PATIENT_NOT_FOUND')) return new AppError('Patient not found in this family', 404);
  return error;
}

async function deleteNeonIdentity(userId: string) {
  requireIdentityDeletionConfiguration(userId);
  const path = [process.env.NEON_PROJECT_ID!, process.env.NEON_BRANCH_ID!, userId].map(encodeURIComponent);
  const response = await fetch(`https://console.neon.tech/api/v2/projects/${path[0]}/branches/${path[1]}/auth/users/${path[2]}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok && response.status !== 404) throw new Error('Identity deletion failed');
}

/** Claim with a lease; crashes and provider failures remain retryable. Never log targets. */
export async function processDeletionJobs(limit = 20) {
  const startedAt = Date.now();
  let completed = 0;
  let failed = 0;
  for (let i = 0; i < limit && Date.now() - startedAt < 40000; i++) {
    const [job] = await sql`
      UPDATE deletion_jobs SET available_at = NOW() + INTERVAL '5 minutes', attempts = attempts + 1
      WHERE id = (SELECT id FROM deletion_jobs WHERE available_at <= NOW() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, kind, target
    `;
    if (!job) break;
    try {
      if (job.kind === 'r2') await deleteFromR2(String(job.target));
      else if (job.kind === 'neon') await deleteNeonIdentity(String(job.target));
      else if (job.kind === 'apple') await revokeAppleToken(decryptSecret(String(job.target)));
      else throw new Error('Unknown deletion job');
      await sql`DELETE FROM deletion_jobs WHERE id = ${String(job.id)}::uuid`;
      completed++;
    } catch {
      failed++;
      await sql`UPDATE deletion_jobs SET available_at = NOW() + INTERVAL '1 hour' WHERE id = ${String(job.id)}::uuid`;
    }
  }
  // Keep tombstones while an identity cleanup is pending, and for the maximum
  // application session lifetime afterwards to reject old cached sessions.
  await sql`DELETE FROM deleted_accounts a WHERE deleted_at < NOW() - INTERVAL '180 days'
    AND NOT EXISTS (SELECT 1 FROM deletion_jobs j WHERE j.kind = 'neon' AND encode(digest(j.target, 'sha256'), 'hex') = a.user_id_hash)`;
  const [remaining] = await sql`SELECT COUNT(*)::int AS count FROM deletion_jobs`;
  return { completed, failed, pending: Number(remaining.count) };
}
