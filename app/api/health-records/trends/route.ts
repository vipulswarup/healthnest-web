import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = request.nextUrl.searchParams.get('patientId');
    const metric = request.nextUrl.searchParams.get('metric')?.trim();
    if (!patientId || !z.string().uuid().safeParse(patientId).success || !metric) {
      throw new AppError('A valid patientId and metric are required', 400);
    }
    if (metric.length > 128) throw new AppError('Metric is too long', 400);

    const patient = await getAccessiblePatient(user.id, patientId);
    if (!patient) throw new AppError('Patient not found', 404);

    const records = await sql`
      SELECT id, source, created_at, data->>${metric} AS metric_value
      FROM health_records
      WHERE patient_id = ${patientId}::uuid
        AND data ? ${metric}
      ORDER BY created_at ASC
    `;
    const trends = records.flatMap((record) => {
      const value = Number.parseFloat(String(record.metric_value));
      return Number.isFinite(value)
        ? [{ date: record.created_at, value, recordId: String(record.id), source: record.source }]
        : [];
    });

    return NextResponse.json({ patientId, metric, trends });
  } catch (error) {
    return handleError(error);
  }
}
