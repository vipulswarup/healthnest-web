import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { createBloodPressureReading, listBloodPressureWeek } from '@/lib/services/blood-pressure.service';
import { inferPeriod, type BpPeriod } from '@/lib/vitals/blood-pressure';

const periodSchema = z.enum(['morning', 'afternoon', 'evening', 'other']);
const createSchema = z.object({
  patientId: z.string().uuid(),
  systolic: z.number().int().min(50).max(250),
  diastolic: z.number().int().min(30).max(180),
  pulse: z.number().int().min(20).max(220).optional().nullable(),
  period: periodSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = request.nextUrl.searchParams.get('patientId');
    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }

    const week = await listBloodPressureWeek(user.id, patientId);
    if (!week) throw new AppError('Patient not found', 404);
    return NextResponse.json(week);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const body = createSchema.parse(await request.json());
    if (body.diastolic >= body.systolic) {
      throw new AppError('Diastolic must be lower than systolic', 400);
    }

    const period: BpPeriod = body.period || inferPeriod();
    const reading = await createBloodPressureReading({
      userId: user.id,
      patientId: body.patientId,
      period,
      systolic: body.systolic,
      diastolic: body.diastolic,
      pulse: body.pulse ?? null,
    });
    if (!reading) throw new AppError('Patient not found', 404);

    const week = await listBloodPressureWeek(user.id, body.patientId);
    return NextResponse.json({ reading, ...(week || { readings: [], days: [], lines: [] }) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the numbers and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}
