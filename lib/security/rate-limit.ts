import { sql } from '@/lib/db/neon';
import { AppError } from '@/lib/middleware/error-handler';

type LimitedAction = 'document-upload' | 'ocr-intake' | 'ocr-full' | 'ai';

const HOUR_MS = 60 * 60 * 1000;

function configuredLimit(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const HOURLY_LIMITS: Record<LimitedAction, number> = {
  'document-upload': configuredLimit('RATE_LIMIT_DOCUMENT_UPLOADS_PER_HOUR', 20),
  // Intake handles one page per document; full OCR is one job per document
  // and batches its pages internally. These defaults support 10 five-page
  // documents in one hour with room for normal retries.
  'ocr-intake': configuredLimit('RATE_LIMIT_OCR_INTAKE_PER_HOUR', 30),
  'ocr-full': configuredLimit('RATE_LIMIT_OCR_FULL_PER_HOUR', 15),
  ai: configuredLimit('RATE_LIMIT_AI_PER_HOUR', 20),
};

function retryAfterSeconds(now = new Date()): number {
  return Math.max(1, Math.ceil((HOUR_MS - (now.getTime() % HOUR_MS)) / 1000));
}

/**
 * Atomically consumes a user-scoped request in the current UTC hour. Keeping
 * the counter in Postgres makes the limit effective across serverless instances.
 */
export async function enforceHourlyRateLimit(userId: string, action: LimitedAction): Promise<void> {
  const limit = HOURLY_LIMITS[action];
  const rows = await sql`
    INSERT INTO api_rate_limits (user_id, action, window_start, request_count)
    VALUES (${userId}, ${action}, date_trunc('hour', NOW()), 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1
      WHERE api_rate_limits.request_count < ${limit}
    RETURNING request_count
  `;

  if (rows.length === 0) {
    throw new AppError(
      'Too many requests. Please try again later.',
      429,
      'RATE_LIMITED',
      undefined,
      { 'Retry-After': String(retryAfterSeconds()) }
    );
  }
}
