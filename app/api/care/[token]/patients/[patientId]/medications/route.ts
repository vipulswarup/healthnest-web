import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/neon';
import { careNoStore, requireCarePatient } from '@/lib/care/access';
import { toMedication } from '@/lib/services/medication.service';
import { handleError } from '@/lib/middleware/error-handler';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; patientId: string }> },
) {
  try {
    const { token, patientId } = await params;
    await requireCarePatient(token, patientId);

    const rows = await sql`
      SELECT
        m.*, mc.status AS composition_status, mc.formulation AS composition_formulation,
        mc.catalog_product_id, mc.source_name AS composition_source_name,
        mc.source_version AS composition_source_version, cp.review_status AS catalog_review_status,
        COALESCE(jsonb_agg(jsonb_build_object(
          'canonicalInn', mci.canonical_inn, 'localAlias', mci.local_alias,
          'strength', mci.strength, 'strengthUnit', mci.strength_unit,
          'ingredientOrder', mci.ingredient_order
        ) ORDER BY mci.ingredient_order) FILTER (WHERE mci.id IS NOT NULL), '[]'::jsonb)
          AS composition_ingredients
      FROM medications m
      LEFT JOIN medication_compositions mc ON mc.medication_id = m.id AND mc.is_current = TRUE
      LEFT JOIN medication_catalog_products cp ON cp.id = mc.catalog_product_id
      LEFT JOIN medication_composition_ingredients mci ON mci.composition_id = mc.id
      WHERE m.patient_id = ${patientId}::uuid
      GROUP BY m.id, mc.id, cp.review_status
      ORDER BY m.is_active DESC, m.start_date DESC, m.created_at DESC
    `;

    return NextResponse.json(rows.map(toMedication), { headers: careNoStore });
  } catch (error) {
    return handleError(error);
  }
}
