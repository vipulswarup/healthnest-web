import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { canAccessPatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { backfillPatientChecksums } from '@/lib/services/document-hash.service';
import { findPatientDocumentByChecksum } from '@/lib/services/document.service';

const bodySchema = z.object({
  patientId: z.string().uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    if (!(await canAccessPatient(user.id, parsed.data.patientId))) {
      throw new AppError('Patient not found', 404);
    }

    const pendingChecksums = await backfillPatientChecksums(parsed.data.patientId);
    const document = await findPatientDocumentByChecksum(
      parsed.data.patientId,
      parsed.data.sha256.toLowerCase(),
    );
    return NextResponse.json({
      duplicate: Boolean(document),
      documentId: document?.id || document?._id || null,
      pendingChecksums,
    });
  } catch (error) {
    return handleError(error);
  }
}
