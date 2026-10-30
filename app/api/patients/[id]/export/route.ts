import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { buildPatientExportZip } from '@/lib/services/patient-export.service';

export const maxDuration = 60;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = z.string().uuid().parse((await params).id);
    try {
      const { filename, bytes } = await buildPatientExportZip(user.id, id);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') throw new AppError('Patient not found', 404);
      if (error instanceof Error && error.message === 'NOT_FOUND') throw new AppError('Patient not found', 404);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
