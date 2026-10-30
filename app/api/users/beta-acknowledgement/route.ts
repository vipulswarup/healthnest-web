import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, ensureProfile } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import {
  BETA_ACKNOWLEDGEMENT_TEXT,
  BETA_ACKNOWLEDGEMENT_VERSION,
  GROQ_AI_CONSENT_TEXT,
  GROQ_AI_CONSENT_ACKNOWLEDGEMENT,
  GROQ_AI_CONSENT_VERSION,
} from '@/lib/legal/beta-acknowledgement';
import { AppError, handleError } from '@/lib/middleware/error-handler';

const acknowledgementSchema = z.object({
  version: z.literal(BETA_ACKNOWLEDGEMENT_VERSION),
  groqAiEnabled: z.boolean(),
});

function userAgentFrom(request: NextRequest) {
  return request.headers.get('user-agent')?.slice(0, 512) || null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const [acknowledgement] = await sql`
      SELECT b.accepted_at, c.enabled AS groq_ai_enabled
      FROM beta_acknowledgements b
      LEFT JOIN groq_ai_consents c ON c.user_id = b.user_id
      WHERE b.user_id = ${user.id}
        AND b.acknowledgement_version = ${BETA_ACKNOWLEDGEMENT_VERSION}
      LIMIT 1
    `;

    return NextResponse.json({
      acknowledged: Boolean(acknowledgement) && acknowledgement?.groq_ai_enabled !== null && acknowledgement?.groq_ai_enabled !== undefined,
      version: BETA_ACKNOWLEDGEMENT_VERSION,
      acceptedAt: acknowledgement?.accepted_at || null,
      groqAiEnabled: acknowledgement?.groq_ai_enabled === true,
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
      throw new AppError('The current beta acknowledgement and AI choice must be saved', 400, 'VALIDATION_ERROR');
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
        ${`${BETA_ACKNOWLEDGEMENT_TEXT}\n\n${GROQ_AI_CONSENT_ACKNOWLEDGEMENT}\nGroq processing choice: ${parsed.data.groqAiEnabled ? 'enabled' : 'disabled'}.`},
        ${userAgentFrom(request)}
      )
      ON CONFLICT (user_id, acknowledgement_version) DO NOTHING
      RETURNING accepted_at
    `;

    await sql`
      INSERT INTO groq_ai_consents (user_id, enabled, consent_version, consent_text, user_agent, updated_at)
      VALUES (${user.id}, ${parsed.data.groqAiEnabled}, ${GROQ_AI_CONSENT_VERSION}, ${GROQ_AI_CONSENT_TEXT}, ${userAgentFrom(request)}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        consent_version = EXCLUDED.consent_version,
        consent_text = EXCLUDED.consent_text,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
    `;

    if (!parsed.data.groqAiEnabled) {
      await sql`
        UPDATE documents SET ocr_status = NULL, ai_status = NULL
        WHERE owner_id = ${user.id}
          AND (ocr_status IN ('PENDING', 'PROCESSING') OR ai_status IN ('PENDING', 'PROCESSING'))
      `;
    }

    return NextResponse.json({
      acknowledged: true,
      version: BETA_ACKNOWLEDGEMENT_VERSION,
      groqAiEnabled: parsed.data.groqAiEnabled,
      acceptedAt: acknowledgement?.accepted_at || null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleError(error);
  }
}
