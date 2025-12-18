import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { classifyDocument } from '@/lib/services/ai.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            throw new AppError('Unauthorized', 401);
        }

        const { documentId, text } = await request.json();

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

        // Use provided text or fallback to stored OCR text
        const textToAnalyze = text || document.ocrText;
        if (!textToAnalyze) {
            throw new AppError('No text available for analysis. Run OCR first.', 400);
        }

        await updateDocumentStatus(documentId, { aiStatus: 'PROCESSING' });

        try {
            const result = await classifyDocument(textToAnalyze);

            await updateDocumentStatus(documentId, {
                aiStatus: 'COMPLETED',
                classification: result.classification,
                confidenceScore: result.confidence
            });

            return NextResponse.json(result);
        } catch (error) {
            await updateDocumentStatus(documentId, { aiStatus: 'FAILED' });
            throw error;
        }
    } catch (error) {
        return handleError(error);
    }
}
