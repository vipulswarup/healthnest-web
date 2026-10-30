import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { toCalendarDay } from '@/lib/dates/calendar-date';
import { reportTitle } from '@/lib/reports/report-title';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    await requireCarePatient(token, patientId);

    const tag = request.nextUrl.searchParams.get('tag')?.trim() || '';
    const recordType = request.nextUrl.searchParams.get('recordType')?.trim() || '';
    const keyword = request.nextUrl.searchParams.get('keyword')?.trim().toLowerCase() || '';

    const rows = await sql`
      SELECT id, record_type, source, doctor_name, document_date, created_at, tags, data, document_id
      FROM health_records
      WHERE patient_id = ${patientId}::uuid
        AND (${recordType} = '' OR record_type = ${recordType})
        AND (${tag} = '' OR ${tag} = ANY(tags))
      ORDER BY COALESCE(document_date, created_at::date) DESC, created_at DESC
      LIMIT 500
    `;

    const records = rows
      .map((row) => {
        const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? row.data as Record<string, unknown>
          : {};
        const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
        const title = reportTitle({
          documentDate: row.document_date,
          createdAt: row.created_at,
          recordType: String(row.record_type || ''),
          tags,
          data,
        });
        return {
          id: String(row.id),
          recordType: String(row.record_type || ''),
          source: String(row.source || ''),
          doctorName: row.doctor_name ? String(row.doctor_name) : null,
          documentDate: toCalendarDay(row.document_date) || null,
          createdAt: String(row.created_at),
          documentId: row.document_id ? String(row.document_id) : null,
          tags,
          title,
          summary: typeof data.practitionerSummary === 'object'
            && data.practitionerSummary
            && typeof (data.practitionerSummary as { text?: unknown }).text === 'string'
            ? String((data.practitionerSummary as { text: string }).text)
            : null,
        };
      })
      .filter((record) => {
        if (!keyword) return true;
        const haystack = [record.title, record.source, record.doctorName, record.recordType, ...record.tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(keyword);
      });

    return NextResponse.json({ records }, { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
