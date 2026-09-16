import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { createGrowthMeasurement, listGrowthHistory } from '@/lib/services/growth.service';

const createSchema = z.object({
  patientId: z.string().uuid(),
  heightCm: z.number().min(30).max(250).optional().nullable(),
  weightKg: z.number().min(0.5).max(300).optional().nullable(),
  headCircumCm: z.number().min(20).max(70).optional().nullable(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = request.nextUrl.searchParams.get('patientId');
    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }

    const history = await listGrowthHistory(user.id, patientId);
    if (!history) throw new AppError('Patient not found', 404);
    return NextResponse.json(history);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const body = createSchema.parse(await request.json());
    if (body.heightCm == null && body.weightKg == null && body.headCircumCm == null) {
      throw new AppError('Enter height, weight, or head circumference', 400);
    }

    const measurement = await createGrowthMeasurement({
      userId: user.id,
      patientId: body.patientId,
      heightCm: body.heightCm ?? null,
      weightKg: body.weightKg ?? null,
      headCircumCm: body.headCircumCm ?? null,
      notes: body.notes,
    });
    if (!measurement) throw new AppError('Patient not found', 404);

    const history = await listGrowthHistory(user.id, body.patientId);
    return NextResponse.json({ measurement, ...(history || { measurements: [], lines: [], latest: { heightCm: null, weightKg: null, measuredAt: null }, dateOfBirth: null }) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the numbers and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}
