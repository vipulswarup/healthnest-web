import { sql } from '@/lib/db/neon';
import { AppError } from '@/lib/middleware/error-handler';

/** AI remains disabled until this account has explicitly saved an enabled choice. */
export async function hasGroqAiConsent(userId: string): Promise<boolean> {
  const [consent] = await sql`
    SELECT enabled FROM groq_ai_consents WHERE user_id = ${userId} LIMIT 1
  `;
  return consent?.enabled === true;
}

export async function requireGroqAiConsent(userId: string): Promise<void> {
  if (!await hasGroqAiConsent(userId)) {
    throw new AppError('AI document processing is off. Enable Groq AI in Settings to use this feature.', 403, 'GROQ_AI_DISABLED');
  }
}
