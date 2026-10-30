import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import {
  deleteBloodPressureReading,
  listBloodPressureWeek,
  updateBloodPressureReading,
} from '@/lib/services/blood-pressure.service';

const patchSchema = z.object({
  systolic: z.number().int().min(50).max(250),
  diastolic: z.number().int().min(30).max(180),
  pulse: z.number().int().min(20).max(220).optional().nullable(),
  period: z.enum(['morning', 'afternoon', 'evening', 'other']).optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid reading ID', 400);

    const body = patchSchema.parse(await request.json());
    if (body.diastolic >= body.systolic) throw new AppError('Diastolic must be lower than systolic', 400);

    const reading = await updateBloodPressureReading({
      userId: user.id,
      readingId: id,
      systolic: body.systolic,
      diastolic: body.diastolic,
      pulse: body.pulse ?? null,
      period: body.period,
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : undefined,
    });
    if (!reading) throw new AppError('Reading not found', 404);

    const week = await listBloodPressureWeek(user.id, reading.patientId);
    return NextResponse.json({ reading, ...(week || { readings: [], days: [], lines: [] }) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the numbers and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid reading ID', 400);

    const deleted = await deleteBloodPressureReading(user.id, id);
    if (!deleted) throw new AppError('Reading not found or cannot be deleted', 404);

    const week = await listBloodPressureWeek(user.id, deleted.patientId);
    return NextResponse.json({ ok: true, ...(week || { readings: [], days: [], lines: [] }) });
  } catch (error) {
    return handleError(error);
  }
}
