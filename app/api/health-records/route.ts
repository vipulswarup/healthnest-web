import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { toHealthRecord } from '@/lib/db/records';
import {
  canAccessPatient,
  getAccessibleDocument,
  requireActiveHouseholdId,
} from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';

const recordSchema = z.object({
  patientId: z.string().uuid(), recordType: z.string().min(1), data: z.record(z.string(), z.any()), tags: z.array(z.string()).optional(),
  source: z.string().optional(), doctorName: z.string().optional(), documentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  documentId: z.string().uuid().optional(), ocrText: z.string().optional(), hospitalSystemName: z.string().optional(),
  hospitalIdentifierType: z.string().optional(), hospitalIdentifierValue: z.string().optional(),
});

async function currentUser() { const user = await getCurrentUser(); if (!user) throw new AppError('Unauthorized', 401); return user; }

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    let activeHouseholdId: string;
    try {
      activeHouseholdId = await requireActiveHouseholdId(user.id);
    } catch {
      throw new AppError('Create or join a household before viewing records', 400, 'NO_HOUSEHOLD');
    }

    const params = request.nextUrl.searchParams;
    const patientId = params.get('patientId') || null;
    if (patientId && !z.string().uuid().safeParse(patientId).success) throw new AppError('Invalid patient ID', 400);
    const keyword = params.get('keyword')?.trim() || null;
    const source = params.get('source')?.trim() || null;
    const recordType = params.get('recordType')?.trim() || null;
    const tag = params.get('tag')?.trim() || null;
    const startDate = params.get('startDate') || null;
    const endDate = params.get('endDate') || null;

    const records = await sql`
      SELECT hr.* FROM health_records hr
      JOIN patients p ON p.id = hr.patient_id
      INNER JOIN household_patients hp ON hp.patient_id = p.id
      WHERE hp.household_id = ${activeHouseholdId}::uuid
        AND EXISTS (
          SELECT 1 FROM household_members hm
          WHERE hm.household_id = hp.household_id AND hm.user_id = ${user.id}
        )
        AND (${patientId}::uuid IS NULL OR hr.patient_id = ${patientId}::uuid)
        AND (${source}::text IS NULL OR hr.source ILIKE '%' || ${source} || '%')
        AND (${recordType}::text IS NULL OR hr.record_type = ${recordType})
        AND (${tag}::text IS NULL OR ${tag} = ANY(hr.tags))
        AND (${startDate}::date IS NULL OR hr.created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR hr.created_at < (${endDate}::date + INTERVAL '1 day'))
        AND (${keyword}::text IS NULL OR CONCAT_WS(' ', hr.source, hr.doctor_name, hr.record_type, hr.ocr_text, hr.data::text) ILIKE '%' || ${keyword} || '%' OR EXISTS (SELECT 1 FROM unnest(hr.tags) AS record_tag WHERE record_tag ILIKE '%' || ${keyword} || '%'))
      ORDER BY hr.created_at DESC
    `;

    return NextResponse.json(records.map(toHealthRecord));
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const parsed = recordSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;
    if (!(await canAccessPatient(user.id, data.patientId))) throw new AppError('Patient not found', 404);
    let ocrText = data.ocrText || null;
    if (data.documentId) {
      const document = await getAccessibleDocument(user.id, data.documentId);
      if (!document) throw new AppError('Document not found', 404);
      if (!ocrText && typeof document.ocr_text === 'string') ocrText = document.ocr_text;
    }
    const [record] = await sql`
      INSERT INTO health_records (patient_id, record_type, data, tags, source, doctor_name, document_date, document_id, ocr_text, hospital_system_name, hospital_identifier_type, hospital_identifier_value)
      VALUES (${data.patientId}::uuid, ${data.recordType}, ${JSON.stringify(data.data)}::jsonb, ${data.tags || []}, ${data.source?.trim() || 'Not specified'}, ${data.doctorName || null}, ${data.documentDate || null}::date, ${data.documentId || null}::uuid, ${ocrText}, ${data.hospitalSystemName || null}, ${data.hospitalIdentifierType || null}, ${data.hospitalIdentifierValue || null})
      RETURNING *
    `;
    await recordAuditEvent({
      actorId: user.id,
      patientId: data.patientId,
      eventType: 'created',
      entityType: 'health_record',
      entityId: record.id,
    });
    const { notifyPatientHousehold } = await import('@/lib/services/device-push.service');
    await notifyPatientHousehold(data.patientId, {
      title: 'New report in SanoVault',
      body: 'A family member filed a report. Open the app to check it.',
      data: { patientId: data.patientId, recordId: String(record.id) },
    }, user.id).catch(() => undefined);
    return NextResponse.json(toHealthRecord(record), { status: 201 });
  } catch (error) { return handleError(error); }
}
