import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processWhatsAppIngest } from '@/lib/services/whatsapp-ingest.service';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Retry / fallback for WhatsApp OCR+AI after patient pick.
 * Auth: Bearer CRON_SECRET (or WHATSAPP_INTERNAL_SECRET if set).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_INTERNAL_SECRET || process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { inboundId?: string } | null;
  const parsed = z.object({ inboundId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'inboundId required' }, { status: 400 });
  }

  await processWhatsAppIngest(parsed.data.inboundId);
  return NextResponse.json({ ok: true });
}
