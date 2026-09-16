import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessDocument } from '@/lib/households/access';
import { getR2SignedUrl } from '@/lib/r2';
import { getDocumentById } from '@/lib/services/document.service';
import { needsBrowserPreviewConversion } from '@/lib/images/normalize';
import { handleError, AppError } from '@/lib/middleware/error-handler';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const { documentId } = await request.json();
    if (!z.string().uuid().safeParse(documentId).success) throw new AppError('A valid document ID is required', 400);
    const document = await getDocumentById(documentId);
    if (!document) throw new AppError('Document not found', 404);
    if (!(await canAccessDocument(user.id, documentId))) throw new AppError('Forbidden', 403);
    if (!document.r2Key) throw new AppError('This document is not stored in Cloudflare R2', 409);

    const downloadUrl = await getR2SignedUrl(document.r2Key, SIGNED_URL_TTL_SECONDS);
    const url = needsBrowserPreviewConversion(document.fileType)
      ? `/api/documents/preview?documentId=${encodeURIComponent(documentId)}`
      : downloadUrl;
    return NextResponse.json(
      { url, downloadUrl, fileName: document.fileName, fileType: document.fileType },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
