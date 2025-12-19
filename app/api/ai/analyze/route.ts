import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { analyzeDocument } from '@/lib/services/ai.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { findDoctorByName } from '@/lib/services/doctor.service';

function limitToFirstNWords(text: string, maxWords: number): string {
    if (!text || text.trim().length === 0) {
        return text;
    }
    
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    
    return words.slice(0, maxWords).join(' ');
}

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
            // Limit to first 1000 words to save AI costs
            const limitedText = limitToFirstNWords(document.ocrText, 1000);
            const result = await analyzeDocument(limitedText);

            // Normalize doctor name if provided
            let normalizedDoctorName = result.doctorName || null;
            if (normalizedDoctorName) {
                try {
                    const matchedDoctor = await findDoctorByName(normalizedDoctorName);
                    if (matchedDoctor) {
                        normalizedDoctorName = matchedDoctor.preferredName;
                    }
                } catch (err) {
                    console.warn('Failed to normalize doctor name:', err);
                }
            }

            await updateDocumentStatus(documentId, {
                aiStatus: 'COMPLETED',
                classification: result.classification,
                confidenceScore: result.confidence,
                suggestedTags: result.tags,
                approvedTags: result.tags.length > 0 ? result.tags : undefined,
                extractedData: { 
                    ...(document.extractedData || {}), 
                    source: result.source,
                    doctorName: normalizedDoctorName
                }
            });

            return NextResponse.json({
                ...result,
                doctorName: normalizedDoctorName
            });
        } catch (error) {
            await updateDocumentStatus(documentId, { aiStatus: 'FAILED' });
            throw error;
        }
    } catch (error) {
        return handleError(error);
    }
}
