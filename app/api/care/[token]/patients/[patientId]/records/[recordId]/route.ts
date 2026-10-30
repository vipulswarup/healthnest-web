import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { toCalendarDay } from '@/lib/dates/calendar-date';
import { reportTitle } from '@/lib/reports/report-title';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string; recordId: string }> },
) {
  try {
    const { token, patientId, recordId } = await params;
    await requireCarePatient(token, patientId);
    if (!z.string().uuid().safeParse(recordId).success) throw new AppError('Invalid record', 400);

    const [row] = await sql`
      SELECT id, record_type, source, doctor_name, document_date, created_at, tags, data, document_id
      FROM health_records
      WHERE id = ${recordId}::uuid AND patient_id = ${patientId}::uuid
      LIMIT 1
    `;
    if (!row) throw new AppError('Record not found', 404);

    const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
      ? row.data as Record<string, unknown>
      : {};
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];

    return NextResponse.json({
      id: String(row.id),
      recordType: String(row.record_type || ''),
      source: String(row.source || ''),
      doctorName: row.doctor_name ? String(row.doctor_name) : null,
      documentDate: toCalendarDay(row.document_date) || null,
      createdAt: String(row.created_at),
      documentId: row.document_id ? String(row.document_id) : null,
      tags,
      title: reportTitle({
        documentDate: row.document_date,
        createdAt: row.created_at,
        recordType: String(row.record_type || ''),
        tags,
        data,
      }),
      summary: typeof data.practitionerSummary === 'object'
        && data.practitionerSummary
        && typeof (data.practitionerSummary as { text?: unknown }).text === 'string'
        ? String((data.practitionerSummary as { text: string }).text)
        : null,
      facility: typeof data.facility === 'string' ? data.facility : null,
      customType: typeof data.customType === 'string' ? data.customType : null,
    }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
