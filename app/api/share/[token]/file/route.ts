import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2';
import { getPublicDocumentShare } from '@/lib/services/document-share.service';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 60;

function safeFileName(name: string): string {
  return name.replace(/[\r\n"]/g, '_').slice(0, 120) || 'document';
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const token = (await params).token?.trim();
    if (!token || token.length < 32) throw new AppError('Share link not found', 404);

    const share = await getPublicDocumentShare(token);
    if (!share) throw new AppError('This share link has expired or been revoked', 404);

    const body = await getR2Object(share.r2Key);
    if (!body) throw new AppError('Document is unavailable', 422);
    const bytes = Buffer.from(await body.transformToByteArray());

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': share.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeFileName(share.fileName || 'document')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
