import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessDocument } from '@/lib/households/access';
import { getR2Object } from '@/lib/r2';
import { getDocumentById } from '@/lib/services/document.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 60;

function safeFileName(name: string): string {
  return name.replace(/[\r\n"]/g, '_').slice(0, 120) || 'document';
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid document ID', 400);
    const document = await getDocumentById(id);
    if (!document) throw new AppError('Document not found', 404);
    if (!(await canAccessDocument(user.id, id))) throw new AppError('Forbidden', 403);
    if (!document.r2Key) throw new AppError('This document is not stored in Cloudflare R2', 409);

    const body = await getR2Object(document.r2Key);
    if (!body) throw new AppError('Stored document is empty', 422);
    const bytes = Buffer.from(await body.transformToByteArray());

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': document.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeFileName(document.fileName)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
