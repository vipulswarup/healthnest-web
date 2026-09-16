import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { clusterDoctorNames } from '@/lib/doctors/normalize';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const rows = await sql`
      SELECT DISTINCT hr.doctor_name AS name
      FROM health_records hr
      INNER JOIN household_patients hp ON hp.patient_id = hr.patient_id
      INNER JOIN household_members hm
        ON hm.household_id = hp.household_id AND hm.user_id = ${user.id}
      WHERE hr.doctor_name IS NOT NULL
        AND btrim(hr.doctor_name) <> ''
      ORDER BY name
    `;

    const names = clusterDoctorNames(rows.map((row) => String(row.name || '')));
    return NextResponse.json(
      names.map((preferredName) => ({
        id: preferredName,
        preferredName,
        aliases: [] as string[],
        isActive: true,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}
