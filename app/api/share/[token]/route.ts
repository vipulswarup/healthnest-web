import { NextRequest, NextResponse } from 'next/server';
import { getPublicDocumentShare } from '@/lib/services/document-share.service';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const token = (await params).token?.trim();
    if (!token || token.length < 32) throw new AppError('Share link not found', 404);

    const share = await getPublicDocumentShare(token);
    if (!share) throw new AppError('This share link has expired or been revoked', 404);

    return NextResponse.json({
      label: share.label || share.fileName || 'Health record',
      fileName: share.fileName || 'document',
      fileType: share.fileType || 'application/octet-stream',
      expiresAt: share.expiresAt,
      fileUrl: `/api/share/${token}/file`,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleError(error);
  }
}
