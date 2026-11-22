import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { notifyPatientHousehold } from '@/lib/services/device-push.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const due = await sql`
    SELECT m.id, m.patient_id, m.name, p.first_name
    FROM medications m
    INNER JOIN patients p ON p.id = m.patient_id
    WHERE m.is_active
      AND m.reorder_status = 'ready'
      AND m.reorder_next_date <= CURRENT_DATE
      AND m.reorder_notified_date IS NULL
  `;

  let notified = 0;
  for (const medication of due) {
    await notifyPatientHousehold(String(medication.patient_id), {
      title: `Check ${String(medication.first_name)}’s medicine supply`,
      body: `It may be time to reorder ${String(medication.name)}. Mark it ordered or received in Medicines.`,
      data: { medicationId: String(medication.id), type: 'medication-reorder' },
    });
    await sql`
      UPDATE medications SET reorder_notified_date = CURRENT_DATE, updated_at = NOW()
      WHERE id = ${medication.id}::uuid AND reorder_status = 'ready'
    `;
    notified += 1;
  }

  return NextResponse.json({ notified }, { headers: { 'Cache-Control': 'no-store' } });
}
