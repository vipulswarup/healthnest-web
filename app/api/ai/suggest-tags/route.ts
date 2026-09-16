import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDocumentById, updateDocumentStatus } from '@/lib/services/document.service';
import { suggestTags } from '@/lib/services/ai.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { enforceHourlyRateLimit } from '@/lib/security/rate-limit';

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
        const user = await getCurrentUser();
        if (!user) {
            throw new AppError('Unauthorized', 401);
        }
        await enforceHourlyRateLimit(user.id, 'ai');

        const { documentId, text } = await request.json();

        if (!documentId) {
            throw new AppError('Document ID is required', 400);
        }

        const document = await getDocumentById(documentId);
        if (!document) {
            throw new AppError('Document not found', 404);
        }

        if (document.userId !== user.id) {
            throw new AppError('Forbidden', 403);
        }

        const textToAnalyze = text || document.ocrText;
        if (!textToAnalyze) {
            throw new AppError('No text available for analysis. Run OCR first.', 400);
        }

        // Limit to first 1000 words to save AI costs
        const limitedText = limitToFirstNWords(textToAnalyze, 1000);
        const tagResult = await suggestTags(limitedText);

        // Auto-select all tags returned by AI
        const autoSelectedTags = tagResult.allTags;
        await updateDocumentStatus(documentId, {
            suggestedTags: tagResult.allTags,
            approvedTags: tagResult.allTags.length > 0 ? tagResult.allTags : undefined
        });

        return NextResponse.json({ 
            tags: tagResult.allTags,
            matchedTags: tagResult.matchedTags,
            newTags: tagResult.newTags,
            autoSelected: autoSelectedTags
        });
    } catch (error) {
        return handleError(error);
    }
}
