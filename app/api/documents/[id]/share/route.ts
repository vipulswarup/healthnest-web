import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { appBaseUrl } from '@/lib/email/templates';
import {
  createDocumentShare,
  getActiveDocumentShare,
  revokeDocumentShare,
} from '@/lib/services/document-share.service';
import { getDocumentById } from '@/lib/services/document.service';
import { canAccessDocument } from '@/lib/households/access';
import { recordAuditEvent } from '@/lib/services/audit.service';

const idSchema = z.string().uuid();
const createSchema = z.object({
  label: z.string().max(160).optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

function sharePayload(share: Awaited<ReturnType<typeof getActiveDocumentShare>>, origin: string) {
  if (!share) return null;
  const shareUrl = `${origin.replace(/\/$/, '')}/share/${share.token}`;
  return {
    id: share.id,
    token: share.token,
    shareUrl,
    label: share.label,
    expiresAt: share.expiresAt,
    createdAt: share.createdAt,
  };
}

async function resolveContext(params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const id = (await params).id;
  if (!idSchema.safeParse(id).success) throw new AppError('Invalid document ID', 400);
  const document = await getDocumentById(id);
  if (!document) throw new AppError('Document not found', 404);
  if (!(await canAccessDocument(user.id, id))) throw new AppError('Forbidden', 403);
  return { user, id, document };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await resolveContext(params);
    const share = await getActiveDocumentShare(id);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://sanovault.com';
    return NextResponse.json({ share: sharePayload(share, origin) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id, document } = await resolveContext(params);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const share = await createDocumentShare({
      documentId: id,
      userId: user.id,
      label: parsed.data.label || document.fileName,
      expiresInDays: parsed.data.expiresInDays,
    });

    await recordAuditEvent({
      actorId: user.id,
      eventType: 'updated',
      entityType: 'document',
      entityId: id,
      metadata: { fields: ['share_link'] },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || appBaseUrl();
    return NextResponse.json({ share: sharePayload(share, origin) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return handleError(new AppError('Forbidden', 403));
    }
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await resolveContext(params);
    const revoked = await revokeDocumentShare(id, user.id);
    if (revoked) {
      await recordAuditEvent({
        actorId: user.id,
        eventType: 'updated',
        entityType: 'document',
        entityId: id,
        metadata: { fields: ['share_revoked'] },
      });
    }
    return NextResponse.json({ revoked });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return handleError(new AppError('Forbidden', 403));
    }
    return handleError(error);
  }
}
