import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { toVisitNote, visitNotesForPacket } from '@/lib/visit-notes/format';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    const { patient } = await requireCarePatient(token, patientId);

    const preferences = (patient.preferences && typeof patient.preferences === 'object')
      ? patient.preferences as Record<string, unknown>
      : {};
    const nextAppointment = typeof preferences.nextAppointmentDate === 'string'
      ? preferences.nextAppointmentDate.slice(0, 10)
      : null;
    const legacyPleaseAsk = typeof preferences.pleaseAsk === 'string' ? preferences.pleaseAsk : '';

    const rows = await sql`
      SELECT id, patient_id, note_date, observed, ask_doctor, pinned, created_at
      FROM visit_notes
      WHERE patient_id = ${patientId}::uuid
      ORDER BY note_date DESC, created_at DESC
      LIMIT 100
    `;
    const notes = rows.map(toVisitNote);
    return NextResponse.json({
      notes,
      nextAppointment,
      packetLines: visitNotesForPacket({ notes, nextAppointment, legacyPleaseAsk }),
    }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
