import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { analyzeDocument } from '@/lib/services/ai.service';
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

        if (!document.ocrText) {
            throw new AppError('Document has no extracted text. Run OCR first.', 400);
        }

        await updateDocumentStatus(documentId, { aiStatus: 'PROCESSING' });

        try {
            const result = await analyzeDocument(document.ocrText);

            await updateDocumentStatus(documentId, {
                aiStatus: 'COMPLETED',
                classification: result.classification,
                confidenceScore: result.confidence,
                suggestedTags: result.tags,
                // We might want to save source in extractedData or a new field, 
                // but for now the frontend just needs it to populate the form.
                // Let's store it in extractionData for persistence or just return it.
                // Document type definition needs update to store 'source' if we want to persist it on the doc model.
                // For now, let's put it in extractedData.
                extractedData: { ...(document.extractedData || {}), source: result.source }
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
