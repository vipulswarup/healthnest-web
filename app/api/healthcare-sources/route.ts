import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';

async function authorize() { if (!await getCurrentUser()) throw new AppError('Unauthorized', 401); }
export async function GET() {
  try { await authorize(); return NextResponse.json(await sql`SELECT id, preferred_name AS "preferredName", aliases, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM healthcare_sources WHERE is_active = TRUE ORDER BY preferred_name`); }
  catch (error) { return handleError(error); }
}
