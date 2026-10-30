import { z } from 'zod';
import { AppError } from '@/lib/middleware/error-handler';
import { isShareTokenShape } from '@/lib/services/document-share.service';
import { assertCarePatientAccess, type CareShare } from '@/lib/services/care-share.service';

export const careNoStore = { 'Cache-Control': 'private, no-store' } as const;

export function parseCareToken(token: string) {
  if (!isShareTokenShape(token) && !/^[A-Za-z0-9_-]{16,80}$/.test(token)) {
    throw new AppError('Invalid share link', 400);
  }
  return token;
}

export async function requireCarePatient(
  token: string,
  patientId: string,
): Promise<{ share: CareShare; patient: Record<string, unknown> }> {
  parseCareToken(token);
  if (!z.string().uuid().safeParse(patientId).success) {
    throw new AppError('Invalid patient', 400);
  }
  const access = await assertCarePatientAccess(token, patientId);
  if (!access) throw new AppError('Share not found or revoked', 404);
  return access;
}
