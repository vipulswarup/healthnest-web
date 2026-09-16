import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { listBloodPressureWeek, syncBloodPressureFromHealth } from '@/lib/services/blood-pressure.service';
import { inferPeriod, type BpPeriod } from '@/lib/vitals/blood-pressure';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const itemSchema = z.object({
  patientId: z.string().uuid(),
  systolic: z.number().int().min(50).max(250),
  diastolic: z.number().int().min(30).max(180),
  pulse: z.number().int().min(20).max(220).optional().nullable(),
  recordedAt: z.string().datetime(),
  period: z.enum(['morning', 'afternoon', 'evening', 'other']).optional(),
  source: z.enum(['healthkit', 'health_connect']),
  externalId: z.string().min(1).max(200),
});

const bodySchema = z.object({
  readings: z.array(itemSchema).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError('Check the blood pressure readings and try again', 400);

    let lastPatientId: string | null = null;
    const results = [];
    for (const item of parsed.data.readings) {
      if (item.diastolic >= item.systolic) continue;
      const recordedAt = new Date(item.recordedAt);
      const period: BpPeriod = item.period || inferPeriod(recordedAt);
      const synced = await syncBloodPressureFromHealth({
        userId: user.id,
        patientId: item.patientId,
        period,
        systolic: item.systolic,
        diastolic: item.diastolic,
        pulse: item.pulse ?? null,
        recordedAt,
        source: item.source,
        externalId: item.externalId,
      });
      if (synced) {
        lastPatientId = item.patientId;
        results.push(synced);
      }
    }

    const week = lastPatientId ? await listBloodPressureWeek(user.id, lastPatientId) : null;
    return NextResponse.json({ synced: results.length, ...(week || {}) });
  } catch (error) {
    return handleError(error);
  }
}
