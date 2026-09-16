import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { createVisitNote, listVisitNotes } from '@/lib/services/visit-notes.service';

const createSchema = z.object({
  patientId: z.string().uuid(),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observed: z.string().max(2000).optional().default(''),
  askDoctor: z.string().max(2000).optional().default(''),
  pinned: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = request.nextUrl.searchParams.get('patientId');
    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }

    const data = await listVisitNotes(user.id, patientId);
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
    if (!body.observed.trim() && !body.askDoctor.trim()) {
      throw new AppError('Write what you noticed or what to ask the doctor', 400);
    }

    const note = await createVisitNote({
      userId: user.id,
      patientId: body.patientId,
      noteDate: body.noteDate,
      observed: body.observed.trim(),
      askDoctor: body.askDoctor.trim(),
      pinned: body.pinned,
    });
    if (!note) throw new AppError('Patient not found', 404);

    const data = await listVisitNotes(user.id, body.patientId);
    return NextResponse.json({ note, ...(data || { notes: [], nextAppointment: null, packetLines: [] }) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the note and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}
