import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { createVaccination, listVaccinations } from '@/lib/services/vaccinations.service';

const createSchema = z.object({
  patientId: z.string().uuid(),
  vaccineName: z.string().min(1).max(160),
  doseLabel: z.string().max(80).optional(),
  administeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  provider: z.string().max(160).optional(),
  lotNumber: z.string().max(80).optional(),
  site: z.string().max(80).optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
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

    const data = await listVaccinations(user.id, patientId);
    if (!data) throw new AppError('Patient not found', 404);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const body = createSchema.parse(await request.json());
    const vaccination = await createVaccination({
      userId: user.id,
      patientId: body.patientId,
      vaccineName: body.vaccineName,
      doseLabel: body.doseLabel,
      administeredDate: body.administeredDate,
      provider: body.provider,
      lotNumber: body.lotNumber,
      site: body.site,
      nextDueDate: body.nextDueDate,
      notes: body.notes,
    });
    if (!vaccination) throw new AppError('Patient not found', 404);

    const data = await listVaccinations(user.id, body.patientId);
    return NextResponse.json({ vaccination, ...(data || { vaccinations: [], upcoming: [], packetLines: [] }) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the vaccination details and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}
