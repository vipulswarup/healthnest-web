import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { processDeletionJobs } from '@/lib/services/deletion.service';

export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await sql`DELETE FROM auth_rate_limits WHERE window_start < NOW() - INTERVAL '24 hours'`;
  const result = await processDeletionJobs(10);
  return NextResponse.json(result, { status: result.failed ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
