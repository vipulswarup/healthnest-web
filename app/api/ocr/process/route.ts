import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { extractTextFromImage } from '@/lib/services/ocr.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            throw new AppError('Unauthorized', 401);
        }

        const { documentId } = await request.json();

        if (!documentId) {
            throw new AppError('Document ID is required', 400);
        }

        const document = await getDocumentById(documentId);
        if (!document) {
            throw new AppError('Document not found', 404);
        }

        if (document.userId !== session.user.id) {
            throw new AppError('Forbidden', 403);
        }

        await updateDocumentStatus(documentId, { ocrStatus: 'PROCESSING' });

        try {
            // Use r2Key if available for secure download, otherwise fallback to URL
            const text = await extractTextFromImage(document.r2Key || document.fileUrl, !!document.r2Key);

            await updateDocumentStatus(documentId, {
                ocrStatus: 'COMPLETED',
                ocrText: text
            });

            return NextResponse.json({ text });
        } catch (error) {
            await updateDocumentStatus(documentId, { ocrStatus: 'FAILED' });
            throw error;
        }
    } catch (error) {
        return handleError(error);
    }
}
