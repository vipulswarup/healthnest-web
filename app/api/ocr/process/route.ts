import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDocumentById, updateDocumentStatus, updateDocumentStorage } from '@/lib/services/document.service';
import { extractTextFromImage, OcrMode, pdfLacksTextLayer } from '@/lib/services/ocr.service';
import { getR2Object, uploadToR2 } from '@/lib/r2';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { enforceHourlyRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
/** Full multi-page OCR can exceed 60s on long scanned labs. */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new AppError('Unauthorized', 401);
        }

        const body = await request.json();
        const { documentId } = body;
        const mode: OcrMode = body.mode === 'full' ? 'full' : 'intake';

        if (!documentId) {
            throw new AppError('Document ID is required', 400);
        }
        await enforceHourlyRateLimit(user.id, mode === 'full' ? 'ocr-full' : 'ocr-intake');

        const document = await getDocumentById(documentId);
        if (!document) {
            throw new AppError('Document not found', 404);
        }

        if (document.userId !== user.id) {
            throw new AppError('Forbidden', 403);
        }

        await updateDocumentStatus(documentId, { ocrStatus: 'PROCESSING' });

        try {
            if (!document.r2Key) throw new AppError('Document storage key is missing', 409);
            const text = await extractTextFromImage(document.r2Key, true, { mode });

            if (document.fileType === 'application/pdf' && text) {
                try {
                    const stored = await getR2Object(document.r2Key);
                    if (stored) {
                        const original = Buffer.from(await stored.transformToByteArray());
                        if (await pdfLacksTextLayer(original)) {
                            const { stampInvisibleText } = await import('@/lib/pdf/ops');
                            const stamped = await stampInvisibleText(new Uint8Array(original), text);
                            await uploadToR2(document.r2Key, Buffer.from(stamped), 'application/pdf');
                            await updateDocumentStorage(documentId, stamped.byteLength, 'application/pdf');
                        }
                    }
                } catch {
                    // Keep the original file if the searchable overlay cannot be written.
                }
            }

            await updateDocumentStatus(documentId, {
                ocrStatus: 'COMPLETED',
                ocrText: text,
                extractedData: {
                    ...(document.extractedData || {}),
                    ocrMode: mode,
                },
            });

            const { notifyUsers } = await import('@/lib/services/device-push.service');
            await notifyUsers([user.id], {
              title: 'Report text is ready',
              body: 'SanoVault finished reading the file. Open the app to confirm it.',
              data: { documentId: String(documentId) },
            }).catch(() => undefined);

            return NextResponse.json({ text, mode });
        } catch (error) {
            await updateDocumentStatus(documentId, { ocrStatus: 'FAILED' });
            throw error;
        }
    } catch (error) {
        return handleError(error);
    }
}
