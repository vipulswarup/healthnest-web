import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { GROQ_AI_CONSENT_TEXT, GROQ_AI_CONSENT_VERSION } from '@/lib/legal/beta-acknowledgement';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json());
    if (!parsed.success) throw new AppError('An AI processing choice is required', 400, 'VALIDATION_ERROR');
    await sql`
      INSERT INTO groq_ai_consents (user_id, enabled, consent_version, consent_text, user_agent, updated_at)
      VALUES (${user.id}, ${parsed.data.enabled}, ${GROQ_AI_CONSENT_VERSION}, ${GROQ_AI_CONSENT_TEXT}, ${request.headers.get('user-agent')?.slice(0, 512) || null}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        consent_version = EXCLUDED.consent_version,
        consent_text = EXCLUDED.consent_text,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
    `;
    if (!parsed.data.enabled) {
      await sql`
        UPDATE documents SET ocr_status = NULL, ai_status = NULL
        WHERE owner_id = ${user.id}
          AND (ocr_status IN ('PENDING', 'PROCESSING') OR ai_status IN ('PENDING', 'PROCESSING'))
      `;
    }
    return NextResponse.json({ enabled: parsed.data.enabled }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleError(error);
  }
}
