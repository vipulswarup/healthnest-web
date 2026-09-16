import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { toPatient } from '@/lib/db/mappers';
import {
  canAccessPatient,
  isHouseholdMember,
  linkPatientToHousehold,
  listHouseholdPatients,
} from '@/lib/households/access';
import { getHouseholdForMember } from '@/lib/households/helpers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const idSchema = z.string().uuid();
const linkSchema = z.object({
  patientId: z.string().uuid(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    const household = await getHouseholdForMember(parsedId.data, user.id);
    if (!household) throw new AppError('Household not found', 404);

    const patients = await listHouseholdPatients(user.id, parsedId.data);
    return NextResponse.json(patients.map(toPatient));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsedId = idSchema.safeParse((await params).id);
    if (!parsedId.success) throw new AppError('Invalid household ID', 400);

    if (!(await isHouseholdMember(user.id, parsedId.data))) {
      throw new AppError('Household not found', 404);
    }

    const parsed = linkSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');

    if (!(await canAccessPatient(user.id, parsed.data.patientId))) {
      throw new AppError('Patient not found', 404);
    }

    await linkPatientToHousehold(parsedId.data, parsed.data.patientId);
    return NextResponse.json({ message: 'Patient linked' }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
