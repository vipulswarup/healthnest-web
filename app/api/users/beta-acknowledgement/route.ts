import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, ensureProfile } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import {
  BETA_ACKNOWLEDGEMENT_TEXT,
  BETA_ACKNOWLEDGEMENT_VERSION,
} from '@/lib/legal/beta-acknowledgement';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const acknowledgementSchema = z.object({
  version: z.literal(BETA_ACKNOWLEDGEMENT_VERSION),
});

function userAgentFrom(request: NextRequest) {
  return request.headers.get('user-agent')?.slice(0, 512) || null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const [acknowledgement] = await sql`
      SELECT accepted_at
      FROM beta_acknowledgements
      WHERE user_id = ${user.id}
        AND acknowledgement_version = ${BETA_ACKNOWLEDGEMENT_VERSION}
      LIMIT 1
    `;

    return NextResponse.json({
      acknowledged: Boolean(acknowledgement),
      version: BETA_ACKNOWLEDGEMENT_VERSION,
      acceptedAt: acknowledgement?.accepted_at || null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Unauthorized', 401);
    await ensureProfile(user);

    const parsed = acknowledgementSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError('The current beta acknowledgement must be accepted', 400, 'VALIDATION_ERROR');
    }

    const [acknowledgement] = await sql`
      INSERT INTO beta_acknowledgements (
        user_id,
        acknowledgement_version,
        acknowledgement_text,
        user_agent
      ) VALUES (
        ${user.id},
        ${BETA_ACKNOWLEDGEMENT_VERSION},
        ${BETA_ACKNOWLEDGEMENT_TEXT},
        ${userAgentFrom(request)}
      )
      ON CONFLICT (user_id, acknowledgement_version) DO NOTHING
      RETURNING accepted_at
    `;

    return NextResponse.json({
      acknowledged: true,
      version: BETA_ACKNOWLEDGEMENT_VERSION,
      acceptedAt: acknowledgement?.accepted_at || null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleError(error);
  }
}
