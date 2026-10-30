import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { revokeCareShare, updateCareSharePatients } from '@/lib/services/care-share.service';

const idSchema = z.string().uuid();
const patchSchema = z.object({
  patientIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = idSchema.parse((await params).id);
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    try {
      const share = await updateCareSharePatients({
        userId: user.id,
        shareId: id,
        patientIds: parsed.data.patientIds,
      });
      return NextResponse.json(share);
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') throw new AppError('Share not found', 404);
      if (error instanceof Error && error.message === 'FORBIDDEN') throw new AppError('Patient not found', 404);
      if (error instanceof Error && error.message === 'NO_PATIENTS') throw new AppError('Select at least one patient', 400);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = idSchema.parse((await params).id);
    try {
      await revokeCareShare(user.id, id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') throw new AppError('Share not found', 404);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
