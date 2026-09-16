import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    if (!await getCurrentUser()) throw new AppError('Unauthorized', 401);

    const { name } = await request.json();
    if (!name || !String(name).trim()) {
      throw new AppError('Source name is required', 400);
    }

    const trimmed = String(name).trim();
    const [existing] = await sql`
      SELECT id, preferred_name AS "preferredName", aliases, is_active AS "isActive"
      FROM healthcare_sources
      WHERE is_active = TRUE
        AND (
          preferred_name ILIKE ${trimmed}
          OR ${trimmed} ILIKE ANY(aliases)
          OR preferred_name ILIKE ${'%' + trimmed + '%'}
          OR ${trimmed} ILIKE '%' || preferred_name || '%'
        )
      ORDER BY
        CASE WHEN preferred_name ILIKE ${trimmed} THEN 0 ELSE 1 END,
        preferred_name
      LIMIT 1
    `;

    if (existing) {
      return NextResponse.json({ matched: existing.preferredName, source: existing });
    }

    // The catalog is shared across every account. An unmatched value remains
    // private to the health record being created; only curated data is global.
    return NextResponse.json({ matched: trimmed, source: null });
  } catch (error) {
    return handleError(error);
  }
}
