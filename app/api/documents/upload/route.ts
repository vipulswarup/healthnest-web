import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteFromR2, uploadToR2 } from '@/lib/r2';
import { createDocument } from '@/lib/services/document.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { verifyUploadSignature } from '@/lib/security/file-signature';
import { enforceHourlyRateLimit } from '@/lib/security/rate-limit';
import { recordAuditEvent } from '@/lib/services/audit.service';

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

    const bytes = Buffer.from(await file.arrayBuffer());
    const verifiedFile = verifyUploadSignature(bytes, file.type);
    if (!verifiedFile) {
      throw new AppError(
        'File content does not match an allowed PDF, JPEG, PNG, WebP, TIFF, HEIC/HEIF, AVIF, GIF, or BMP type',
        400,
      );
    }

    const storageKey = `${user.id}/${randomUUID()}.${verifiedFile.extension}`;
    r2Key = storageKey;
    await uploadToR2(storageKey, bytes, verifiedFile.mimeType);

    const document = await createDocument({
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: verifiedFile.mimeType,
      r2Key: storageKey,
    });
    const documentId = document.id || document._id;
    if (!documentId) throw new AppError('Document storage did not return an ID', 500);
    await recordAuditEvent({
      actorId: user.id,
      eventType: 'created',
      entityType: 'document',
      entityId: documentId,
      metadata: { fileSize: file.size, fileType: verifiedFile.mimeType },
    });
    return NextResponse.json(document, { status: 201 });
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
