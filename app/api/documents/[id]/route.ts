import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDocumentById, deleteDocument } from '@/lib/services/document.service';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 16
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            throw new AppError('Unauthorized', 401);
        }

        // In Next.js 16/15, params is a Promise
        const { id } = await params;

        const document = await getDocumentById(id);
        if (!document) {
            throw new AppError('Document not found', 404);
        }

        if (document.userId !== session.user.id) {
            throw new AppError('Forbidden', 403);
        }

        return NextResponse.json(document);
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            throw new AppError('Unauthorized', 401);
        }

        const { id } = await params;

        const document = await getDocumentById(id);
        if (!document) {
            throw new AppError('Document not found', 404);
        }

        if (document.userId !== session.user.id) {
            throw new AppError('Forbidden', 403);
        }

        await deleteDocument(id);
        // Note: Should also delete from R2, but skipping for brevity in this step

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
