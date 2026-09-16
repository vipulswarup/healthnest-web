import { NextRequest, NextResponse } from 'next/server';
import { medicationCatalogueFeedSchema, reconcileMedicationCatalogue } from '@/lib/services/medication-catalogue.service';

export const dynamic = 'force-dynamic';

/**
 * Weekly Vercel Cron target. The feed URL must point to an internally managed,
 * licensed, normalized export built from the approved country data sources.
 * It is deliberately not a general web-search endpoint.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const feedUrl = process.env.MEDICATION_CATALOGUE_FEED_URL;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!feedUrl) {
    return NextResponse.json({ error: 'Medication catalogue feed is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: process.env.MEDICATION_CATALOGUE_FEED_TOKEN
        ? { Authorization: `Bearer ${process.env.MEDICATION_CATALOGUE_FEED_TOKEN}` }
        : undefined,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`The catalogue feed returned ${response.status}`);
    const parsed = medicationCatalogueFeedSchema.safeParse(await response.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Medication catalogue feed has an invalid format' }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    const result = await reconcileMedicationCatalogue(parsed.data);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Medication catalogue reconciliation failed', { errorType: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: 'Medication catalogue reconciliation failed' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
