import { getR2Object } from '@/lib/r2';
import { sha256Hex } from '@/lib/security/checksum';
import {
  countUnhashedPatientDocuments,
  listUnhashedPatientDocuments,
  saveDocumentChecksum,
} from '@/lib/services/document.service';

const BACKFILL_BATCH = 20;
const BACKFILL_BUDGET_MS = 8_000;

export async function backfillPatientChecksums(patientId: string): Promise<number> {
  const started = Date.now();
  let remaining = await countUnhashedPatientDocuments(patientId);

  while (remaining > 0 && Date.now() - started < BACKFILL_BUDGET_MS) {
    const batch = await listUnhashedPatientDocuments(patientId, BACKFILL_BATCH);
    if (batch.length === 0) break;
    for (const document of batch) {
      if (Date.now() - started >= BACKFILL_BUDGET_MS) break;
      try {
        const body = await getR2Object(document.r2_key);
        if (!body) continue;
        const bytes = Buffer.from(await body.transformToByteArray());
        await saveDocumentChecksum(document.id, sha256Hex(bytes));
      } catch {
        // Leave unhashed; the next lookup retries.
      }
    }
    remaining = await countUnhashedPatientDocuments(patientId);
    if (batch.length < BACKFILL_BATCH) break;
  }

  return remaining;
}
