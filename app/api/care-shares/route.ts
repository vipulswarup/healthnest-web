import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { createCareShare, listCareShares } from '@/lib/services/care-share.service';
import { sendCareShareEmail } from '@/lib/email/send';

const createSchema = z.object({
  patientIds: z.array(z.string().uuid()).min(1),
  label: z.string().max(120).optional(),
  invitedEmail: z.string().email().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    return NextResponse.json(await listCareShares(user.id));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    try {
      const share = await createCareShare({
        userId: user.id,
        patientIds: parsed.data.patientIds,
        label: parsed.data.label,
        invitedEmail: parsed.data.invitedEmail,
      });
      if (share.invitedEmail) {
        await sendCareShareEmail({
          to: share.invitedEmail,
          shareUrl: share.shareUrl,
          fromName: user.name || user.email,
          label: share.label,
        }).catch(() => undefined);
      }
      return NextResponse.json(share, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') throw new AppError('Patient not found', 404);
      if (error instanceof Error && error.message === 'NO_PATIENTS') throw new AppError('Select at least one patient', 400);
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
