import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessDocument } from '@/lib/households/access';
import { getR2Object } from '@/lib/r2';
import { getDocumentById } from '@/lib/services/document.service';
import { normalizeImageToJpeg, needsBrowserPreviewConversion } from '@/lib/images/normalize';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const documentId = request.nextUrl.searchParams.get('documentId');
    if (!z.string().uuid().safeParse(documentId).success) {
      throw new AppError('A valid document ID is required', 400);
    }

    const document = await getDocumentById(documentId!);
    if (!document) throw new AppError('Document not found', 404);
    if (!(await canAccessDocument(user.id, documentId!))) throw new AppError('Forbidden', 403);
    if (!document.r2Key) throw new AppError('This document is not stored in Cloudflare R2', 409);
    if (!needsBrowserPreviewConversion(document.fileType)) {
      throw new AppError('This document does not require preview conversion', 400);
    }

    const body = await getR2Object(document.r2Key);
    if (!body) throw new AppError('Stored document is empty', 422);
    const input = Buffer.from(await body.transformToByteArray());
    const preview = await normalizeImageToJpeg(input, document.fileType);

    return new NextResponse(new Uint8Array(preview), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="document-preview.jpg"',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
