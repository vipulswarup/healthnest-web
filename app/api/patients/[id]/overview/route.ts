import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { getAccessiblePatient } from '@/lib/households/access';
import { sql } from '@/lib/db/neon';
import { requireGroqAiConsent } from '@/lib/legal/groq-consent';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { loadPatientOverview, savedCaseSummary } from '@/lib/patients/load-overview';
import { patientCasePrompt } from '@/lib/patients/overview';
import { generatePractitionerSummary } from '@/lib/reports/practitioner-summary';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
async function context(params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) throw new AppError('Invalid patient ID', 400);
  const patient = await getAccessiblePatient(user.id, id);
  if (!patient) throw new AppError('Patient not found', 404);
  return { user, patient, id };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { patient } = await context(params);
    const { overview } = await loadPatientOverview(patient);
    return NextResponse.json(overview, { headers });
  } catch (error) { return handleError(error); }
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, patient, id } = await context(params);
    const current = await loadPatientOverview(patient);
    if (!current.overview.hasEvidence) return NextResponse.json({ state: 'empty', caseSummary: null }, { headers });
    if (current.overview.caseSummary && !current.overview.caseSummary.stale) {
      return NextResponse.json({ state: 'ready', caseSummary: current.overview.caseSummary }, { headers });
    }
    await requireGroqAiConsent(user.id);
    const token = randomUUID();
    const [claimed] = await sql`
      INSERT INTO patient_case_summaries (patient_id, generation_token, generation_expires_at)
      VALUES (${id}::uuid, ${token}::uuid, NOW() + INTERVAL '90 seconds')
      ON CONFLICT (patient_id) DO UPDATE SET
        generation_token = EXCLUDED.generation_token, generation_expires_at = EXCLUDED.generation_expires_at
      WHERE patient_case_summaries.generation_expires_at IS NULL OR patient_case_summaries.generation_expires_at <= NOW()
      RETURNING source_hash, summary, generated_at
    `;
    if (!claimed) return NextResponse.json({ state: 'processing' }, { status: 202, headers: { ...headers, 'Retry-After': '2' } });
    try {
      // Another request may have completed between our first read and lease acquisition.
      const saved = savedCaseSummary(claimed, current.sourceHash);
      if (saved && !saved.stale) return NextResponse.json({ state: 'ready', caseSummary: saved }, { headers });
      let text: string;
      try { text = await generatePractitionerSummary(current.source, patientCasePrompt); }
      catch { throw new AppError('The case summary could not be generated. Please try again.', 502); }
      const freshPatient = await getAccessiblePatient(user.id, id);
      if (!freshPatient) throw new AppError('Patient not found', 404);
      const latest = await loadPatientOverview(freshPatient);
      if (latest.sourceHash !== current.sourceHash) {
        return NextResponse.json({ state: 'changed' }, { status: 202, headers });
      }
      const [savedRow] = await sql`
        UPDATE patient_case_summaries SET summary = ${text}, source_hash = ${current.sourceHash}, generated_at = NOW()
        WHERE patient_id = ${id}::uuid AND generation_token = ${token}::uuid
        RETURNING source_hash, summary, generated_at
      `;
      if (!savedRow) return NextResponse.json({ state: 'processing' }, { status: 202, headers });
      return NextResponse.json({ state: 'ready', caseSummary: savedCaseSummary(savedRow, current.sourceHash) }, { headers });
    } finally {
      await sql`UPDATE patient_case_summaries SET generation_token = NULL, generation_expires_at = NULL
        WHERE patient_id = ${id}::uuid AND generation_token = ${token}::uuid`;
    }
  } catch (error) { return handleError(error); }
}
