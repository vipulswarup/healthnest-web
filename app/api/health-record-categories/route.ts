import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET() {
  try {
    if (!await getCurrentUser()) throw new AppError('Unauthorized', 401);
    const categories = await sql`SELECT id, code, display_name AS "displayName", description, is_active AS "isActive" FROM health_record_categories WHERE is_active = TRUE ORDER BY display_name`;
    return NextResponse.json(categories);
  } catch (error) { return handleError(error); }
}
