import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteFromR2, uploadToR2 } from '@/lib/r2';
import {
  createDocument,
  findPatientDocumentByChecksum,
} from '@/lib/services/document.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { sha256Hex } from '@/lib/security/checksum';
import { verifyUploadSignature } from '@/lib/security/file-signature';
import { enforceHourlyRateLimit } from '@/lib/security/rate-limit';
import { recordAuditEvent } from '@/lib/services/audit.service';
import { canAccessPatient } from '@/lib/households/access';
import { unlockPdfForPatient } from '@/lib/services/pdf-unlock.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function storageErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { name?: unknown; Code?: unknown };
  if (typeof value.Code === 'string') return value.Code;
  return typeof value.name === 'string' ? value.name : undefined;
}

export async function POST(request: NextRequest) {
  let r2Key: string | undefined;
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    await enforceHourlyRateLimit(user.id, 'document-upload');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) throw new AppError('No file provided', 400);
    if (file.size > MAX_FILE_SIZE) throw new AppError('File size exceeds 50MB limit', 400);

    const patientRaw = String(formData.get('patientId') || '').trim();
    const patientId = z.string().uuid().safeParse(patientRaw).success ? patientRaw : undefined;
    if (patientRaw && !patientId) throw new AppError('Invalid patient ID', 400);
    if (patientId && !(await canAccessPatient(user.id, patientId))) {
      throw new AppError('Patient not found', 404);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = sha256Hex(bytes);
    if (patientId) {
      const existing = await findPatientDocumentByChecksum(patientId, checksum);
      if (existing) {
        return NextResponse.json({ ...existing, duplicate: true });
      }
    }

    const verifiedFile = verifyUploadSignature(bytes, file.type, file.name);
    if (!verifiedFile) {
      throw new AppError(
        'File content does not match an allowed PDF, image, or Microsoft Office type',
        400,
      );
    }

    const pdfPassword = String(formData.get('pdfPassword') || '').trim();
    let storedBytes: Buffer | Uint8Array = bytes;
    if (patientId && verifiedFile.mimeType === 'application/pdf') {
      const unlocked = await unlockPdfForPatient({
        bytes,
        patientId,
        extraPasswords: pdfPassword ? [pdfPassword] : [],
        saveExtraPasswords: true,
        actorUserId: user.id,
      });
      if (!unlocked.locked) storedBytes = Buffer.from(unlocked.bytes);
    }

    const storageKey = `${user.id}/${randomUUID()}.${verifiedFile.extension}`;
    r2Key = storageKey;
    await uploadToR2(storageKey, storedBytes, verifiedFile.mimeType);

    const document = await createDocument({
      userId: user.id,
      patientId,
      fileName: file.name,
      fileSize: storedBytes.byteLength,
      fileType: verifiedFile.mimeType,
      r2Key: storageKey,
      checksumSha256: checksum,
    });
    const documentId = document.id || document._id;
    if (!documentId) throw new AppError('Document storage did not return an ID', 500);
    await recordAuditEvent({
      actorId: user.id,
      patientId,
      eventType: 'created',
      entityType: 'document',
      entityId: documentId,
      metadata: { fileSize: file.size, fileType: verifiedFile.mimeType },
    });
    return NextResponse.json({ ...document, duplicate: false }, { status: 201 });
  } catch (error) {
    if (r2Key) await deleteFromR2(r2Key).catch(() => undefined);
    if (storageErrorCode(error) === 'AccessDenied') {
      return handleError(new AppError('Access denied to file storage. Check the R2 credentials and bucket permissions.', 403));
    }
    if (storageErrorCode(error) === 'NoSuchBucket') {
      return handleError(new AppError('Document storage bucket is missing. Create the configured R2 bucket and retry.', 503));
    }
    return handleError(error);
  }
}
