import { AppError } from '@/lib/middleware/error-handler';
import { getR2Object, uploadToR2 } from '@/lib/r2';
import { extractOfficeText, isOfficeMime } from '@/lib/services/office-text.service';
import { extractTextFromBuffer } from '@/lib/services/ocr.service';
import { unlockPdfForPatient } from '@/lib/services/pdf-unlock.service';

export async function extractDocumentText(options: {
  r2Key: string;
  fileType: string;
  fileName?: string;
  patientId?: string;
  extraPasswords?: string[];
  actorUserId?: string;
  mode?: 'intake' | 'full';
}): Promise<string> {
  const body = await getR2Object(options.r2Key);
  if (!body) throw new Error('Empty body from R2');
  let bytes = Buffer.from(await body.transformToByteArray());
  const mime = (options.fileType || '').toLowerCase();

  if (isOfficeMime(mime)) {
    return extractOfficeText(bytes, mime);
  }

  let password: string | undefined;
  const extras = options.extraPasswords || [];
  if (mime === 'application/pdf' && (options.patientId || extras.length > 0)) {
    const unlocked = await unlockPdfForPatient({
      bytes,
      patientId: options.patientId,
      extraPasswords: extras,
      saveExtraPasswords: Boolean(options.actorUserId),
      actorUserId: options.actorUserId,
    });
    if (unlocked.locked) {
      throw new AppError('This PDF is password protected', 409, 'PDF_PASSWORD_REQUIRED');
    }
    bytes = Buffer.from(unlocked.bytes);
    password = unlocked.password;
    if (unlocked.changed) {
      await uploadToR2(options.r2Key, bytes, 'application/pdf');
    }
  }

  return extractTextFromBuffer(bytes, mime, { mode: options.mode || 'intake', password });
}
