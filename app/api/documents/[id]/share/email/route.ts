import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { appBaseUrl } from '@/lib/email/templates';
import { sendDocumentShareEmail } from '@/lib/email/send';
import { getActiveDocumentShare, createDocumentShare } from '@/lib/services/document-share.service';
import { getDocumentById } from '@/lib/services/document.service';
import { canAccessDocument } from '@/lib/households/access';

const idSchema = z.string().uuid();
const emailSchema = z.object({
  to: z.string().trim().email(),
  recipientName: z.string().max(120).optional(),
  label: z.string().max(160).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!idSchema.safeParse(id).success) throw new AppError('Invalid document ID', 400);

    const parsed = emailSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    const document = await getDocumentById(id);
    if (!document) throw new AppError('Document not found', 404);
    if (!(await canAccessDocument(user.id, id))) throw new AppError('Forbidden', 403);

    let share = await getActiveDocumentShare(id);
    if (!share) {
      share = await createDocumentShare({
        documentId: id,
        userId: user.id,
        label: parsed.data.label || document.fileName,
      });
    }

    const origin = appBaseUrl();
    const shareUrl = `${origin}/share/${share.token}`;
    const senderName = user.name || user.email || 'A SanoVault user';
    const documentLabel = share.label || document.fileName;

    const result = await sendDocumentShareEmail({
      to: parsed.data.to,
      recipientName: parsed.data.recipientName,
      senderName,
      documentLabel,
      shareUrl,
      expiresAt: share.expiresAt,
    });

    if (!result.sent) {
      throw new AppError(result.error || 'Could not send email', 502);
    }

    return NextResponse.json({
      sent: true,
      shareUrl,
      expiresAt: share.expiresAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
