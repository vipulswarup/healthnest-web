import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { formatDoctorDisplay, matchDoctorName } from '@/lib/doctors/normalize';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    if (!await getCurrentUser()) throw new AppError('Unauthorized', 401);

    const { name } = await request.json();
    if (!name || !String(name).trim()) {
      throw new AppError('Doctor name is required', 400);
    }

    const trimmed = String(name).trim();
    const catalog = await sql`
      SELECT preferred_name AS "preferredName", aliases
      FROM doctors
      WHERE is_active = TRUE
    `;
    const matched = matchDoctorName(trimmed, catalog.map((row) => ({
      preferredName: String(row.preferredName),
      aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
    })));

    if (matched) {
      return NextResponse.json({ matched, doctor: { preferredName: matched } });
    }

    return NextResponse.json({ matched: formatDoctorDisplay(trimmed), doctor: null });
  } catch (error) {
    return handleError(error);
  }
}
