import { NextRequest, NextResponse } from 'next/server';
import { careNoStore, parseCareToken } from '@/lib/care/access';
import { loadCareShareView } from '@/lib/services/care-share.service';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const token = parseCareToken((await params).token);
    const view = await loadCareShareView(token);
    if (!view) throw new AppError('Share not found or revoked', 404);
    return NextResponse.json(view, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
