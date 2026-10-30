import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { toVaccination, vaccinationsForPacket } from '@/lib/vaccinations/format';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    await requireCarePatient(token, patientId);

    const rows = await sql`
      SELECT id, patient_id, vaccine_name, dose_label, administered_date,
             provider, lot_number, site, next_due_date, notes, created_at
      FROM vaccinations
      WHERE patient_id = ${patientId}::uuid
      ORDER BY administered_date DESC, created_at DESC
      LIMIT 100
    `;
    const vaccinations = rows.map(toVaccination);
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = vaccinations
      .filter((vaccination) => vaccination.nextDueDate && vaccination.nextDueDate >= today)
      .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)))
      .map((vaccination) => ({
        id: vaccination.id,
        vaccineName: vaccination.vaccineName,
        doseLabel: vaccination.doseLabel,
        nextDueDate: vaccination.nextDueDate as string,
      }));

    return NextResponse.json({
      vaccinations,
      upcoming,
      packetLines: vaccinationsForPacket({ vaccinations }),
    }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
