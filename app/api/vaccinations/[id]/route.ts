import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { deleteVaccination, listVaccinations, updateVaccination } from '@/lib/services/vaccinations.service';

const patchSchema = z.object({
  vaccineName: z.string().min(1).max(160).optional(),
  doseLabel: z.string().max(80).optional(),
  administeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  provider: z.string().max(160).optional(),
  lotNumber: z.string().max(80).optional(),
  site: z.string().max(80).optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid vaccination ID', 400);

    const body = patchSchema.parse(await request.json());
    const vaccination = await updateVaccination({
      userId: user.id,
      vaccinationId: id,
      vaccineName: body.vaccineName,
      doseLabel: body.doseLabel,
      administeredDate: body.administeredDate,
      provider: body.provider,
      lotNumber: body.lotNumber,
      site: body.site,
      nextDueDate: body.nextDueDate,
      notes: body.notes,
    });
    if (!vaccination) throw new AppError('Vaccination not found', 404);

    const data = await listVaccinations(user.id, vaccination.patientId);
    return NextResponse.json({ vaccination, ...(data || { vaccinations: [], upcoming: [], packetLines: [] }) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the vaccination details and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid vaccination ID', 400);

    const deleted = await deleteVaccination(user.id, id);
    if (!deleted) throw new AppError('Vaccination not found', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
