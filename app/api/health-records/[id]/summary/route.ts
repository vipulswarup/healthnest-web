import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { requireGroqAiConsent } from '@/lib/legal/groq-consent';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { generatePractitionerSummary, validatePractitionerSummary } from '@/lib/reports/practitioner-summary';

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid health record ID', 400);
    let force = false;
    try {
      const body = await request.json();
      force = Boolean(body?.force);
    } catch {
      force = false;
    }
    const [record] = await sql`
      SELECT hr.* FROM health_records hr
      WHERE hr.id = ${id}::uuid AND EXISTS (
        SELECT 1 FROM household_patients hp
        JOIN household_members hm ON hm.household_id = hp.household_id
        WHERE hp.patient_id = hr.patient_id AND hm.user_id = ${user.id}
      )
    `;
    if (!record) throw new AppError('Health record not found', 404);
    await requireGroqAiConsent(user.id);
    if (!String(record.ocr_text || '').trim()) {
      throw new AppError('A summary is not available because this report has no readable text yet.', 422);
    }
    const source = JSON.stringify({
      reportType: record.record_type,
      date: record.document_date,
      source: record.source,
      doctor: record.doctor_name,
      reportText: record.ocr_text,
    });
    const sourceHash = createHash('sha256').update(`v1:${source}`).digest('hex');
    const cached = record.data?.practitionerSummary;
    let summary: string | undefined;
    if (!force && cached?.sourceHash === sourceHash) {
      try { summary = validatePractitionerSummary(cached.text); } catch { /* Regenerate invalid cached output. */ }
    }
    if (!summary) {
      try {
        summary = await generatePractitionerSummary(source);
      } catch {
        throw new AppError('The AI summary could not be generated. Please try again.', 502);
      }
      // Cache only while the source is unchanged; preserve other record data.
      await sql`
        UPDATE health_records SET data = COALESCE(data, '{}'::jsonb) ||
          ${JSON.stringify({ practitionerSummary: { sourceHash, text: summary } })}::jsonb
        WHERE id = ${id}::uuid AND updated_at = ${record.updated_at}
      `;
    }
    return NextResponse.json({ summary }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleError(error); }
}
