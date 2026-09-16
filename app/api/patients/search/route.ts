import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { toPatient } from '@/lib/db/mappers';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const hospitalSystem = request.nextUrl.searchParams.get('hospitalSystem')?.trim() || null;
    const identifierType = request.nextUrl.searchParams.get('identifierType')?.trim() || null;
    const identifierValue = request.nextUrl.searchParams.get('identifierValue')?.trim() || null;
    const mobileNumber = request.nextUrl.searchParams.get('mobileNumber')?.trim() || null;

    const identifierSearch = Boolean(hospitalSystem && identifierType && identifierValue);
    if (!identifierSearch && !mobileNumber) {
      throw new AppError('Please provide either hospitalSystem+identifierType+identifierValue or mobileNumber', 400);
    }
    if (!identifierSearch && (hospitalSystem || identifierType || identifierValue)) {
      throw new AppError('hospitalSystem, identifierType, and identifierValue must be provided together', 400);
    }

    const patients = await sql`
      SELECT DISTINCT p.*
      FROM patients p
      INNER JOIN household_patients hp ON hp.patient_id = p.id
      INNER JOIN household_members hm
        ON hm.household_id = hp.household_id AND hm.user_id = ${user.id}
      WHERE (
        ${identifierSearch}
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(p.hospital_identifiers) AS identifier
          WHERE identifier->>'systemName' = ${hospitalSystem}
            AND identifier->>'identifierType' = ${identifierType}
            AND identifier->>'value' = ${identifierValue}
        )
      ) OR (
        ${mobileNumber}::text IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(p.mobile_numbers) AS mobile
          WHERE mobile->>'number' = ${mobileNumber}
        )
      )
      ORDER BY p.created_at DESC
    `;
    return NextResponse.json(patients.map(toPatient));
  } catch (error) {
    return handleError(error);
  }
}
