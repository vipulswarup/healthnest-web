import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { deleteVisitNote, listVisitNotes, updateVisitNote } from '@/lib/services/visit-notes.service';

const patchSchema = z.object({
  pinned: z.boolean().optional(),
  observed: z.string().max(2000).optional(),
  askDoctor: z.string().max(2000).optional(),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid note ID', 400);

    const body = patchSchema.parse(await request.json());
    const note = await updateVisitNote({
      userId: user.id,
      noteId: id,
      pinned: body.pinned,
      observed: body.observed,
      askDoctor: body.askDoctor,
      noteDate: body.noteDate,
    });
    if (!note) throw new AppError('Note not found', 404);

    const data = await listVisitNotes(user.id, note.patientId);
    return NextResponse.json({ note, ...(data || { notes: [], nextAppointment: null, packetLines: [] }) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Check the note and try again' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const id = (await params).id;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid note ID', 400);

    const deleted = await deleteVisitNote(user.id, id);
    if (!deleted) throw new AppError('Note not found', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
