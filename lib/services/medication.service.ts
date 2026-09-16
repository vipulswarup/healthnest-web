import { sql } from '@/lib/db/neon';

type MedicationRow = Record<string, unknown>;

export type MedicationIngredientInput = {
  canonicalInn: string;
  localAlias?: string | null;
  strength: string;
  strengthUnit: string;
};

export type MedicationCompositionInput = {
  status: 'CONFIRMED' | 'UNCONFIRMED';
  formulation?: string | null;
  catalogProductId?: string | null;
  sourceName?: string | null;
  sourceVersion?: string | null;
  ingredients: MedicationIngredientInput[];
};

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
}

export function toMedication(row: MedicationRow) {
  const ingredients = arrayValue(row.composition_ingredients).map((ingredient) => ({
    canonicalInn: String(ingredient.canonicalInn || ''),
    localAlias: ingredient.localAlias ? String(ingredient.localAlias) : null,
    strength: String(ingredient.strength || ''),
    strengthUnit: String(ingredient.strengthUnit || ''),
  }));

  const compositionStatus = row.composition_status ? String(row.composition_status) : 'UNCONFIRMED';
  const reviewStatus = row.catalog_review_status ? String(row.catalog_review_status) : null;

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    name: String(row.name),
    originalBrandName: row.original_brand_name ? String(row.original_brand_name) : String(row.name),
    purchaseCountry: row.purchase_country ? String(row.purchase_country) : null,
    indication: row.indication ? String(row.indication) : '',
    stoppedReason: row.stopped_reason ? String(row.stopped_reason) : '',
    dosage: String(row.dosage),
    frequency: String(row.frequency),
    route: String(row.route),
    startDate: row.start_date,
    endDate: row.end_date || null,
    instructions: row.instructions || '',
    prescribedBy: row.prescribed_by || '',
    source: row.source || '',
    isActive: Boolean(row.is_active),
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    composition: {
      status: compositionStatus,
      formulation: row.composition_formulation ? String(row.composition_formulation) : '',
      catalogProductId: row.catalog_product_id ? String(row.catalog_product_id) : null,
      sourceName: row.composition_source_name ? String(row.composition_source_name) : null,
      sourceVersion: row.composition_source_version ? String(row.composition_source_version) : null,
      ingredients,
      reviewStatus,
      requiresWarning: compositionStatus !== 'CONFIRMED' || reviewStatus === 'FLAGGED',
    },
  };
}

export async function getAccessibleMedication(userId: string, medicationId: string): Promise<MedicationRow | null> {
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
    INNER JOIN patients p ON p.id = m.patient_id
    WHERE m.id = ${medicationId}::uuid
      AND EXISTS (
        SELECT 1
        FROM household_patients hp
        INNER JOIN household_members hm
          ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = p.id
      )
    GROUP BY m.id, mc.id, cp.review_status
  `;
  return rows[0] || null;
}

export async function listAccessibleMedications(userId: string, patientId: string, isActive: boolean | null): Promise<MedicationRow[]> {
  return sql`
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
      AND (${isActive}::boolean IS NULL OR m.is_active = ${isActive}::boolean)
      AND EXISTS (
        SELECT 1
        FROM household_patients hp
        INNER JOIN household_members hm
          ON hm.household_id = hp.household_id AND hm.user_id = ${userId}
        WHERE hp.patient_id = m.patient_id
      )
    GROUP BY m.id, mc.id, cp.review_status
    ORDER BY m.is_active DESC, m.start_date DESC, m.created_at DESC
  `;
}

export async function replaceMedicationComposition({
  medicationId,
  userId,
  composition,
}: {
  medicationId: string;
  userId: string;
  composition: MedicationCompositionInput;
}): Promise<void> {
  const previous = await sql`
    UPDATE medication_compositions
    SET is_current = FALSE
    WHERE medication_id = ${medicationId}::uuid AND is_current = TRUE
    RETURNING id
  `;

  const [created] = await sql`
    INSERT INTO medication_compositions (
      medication_id, status, formulation, catalog_product_id, source_name,
      source_version, confirmed_at, created_by, is_current
    ) VALUES (
      ${medicationId}::uuid,
      ${composition.status},
      ${composition.formulation || null},
      ${composition.catalogProductId || null}::uuid,
      ${composition.sourceName || null},
      ${composition.sourceVersion || null},
      ${composition.status === 'CONFIRMED' ? new Date().toISOString() : null}::timestamptz,
      ${userId},
      TRUE
    )
    RETURNING id
  `;

  try {
    await Promise.all(
      composition.ingredients.map((ingredient, index) => sql`
        INSERT INTO medication_composition_ingredients (
          composition_id, canonical_inn, local_alias, strength, strength_unit, ingredient_order
        ) VALUES (
          ${created.id}::uuid, ${ingredient.canonicalInn}, ${ingredient.localAlias || null},
          ${ingredient.strength}, ${ingredient.strengthUnit}, ${index + 1}
        )
      `)
    );
  } catch (error) {
    await sql`DELETE FROM medication_compositions WHERE id = ${created.id}::uuid`;
    if (previous.length > 0) {
      await sql`UPDATE medication_compositions SET is_current = TRUE WHERE id = ${previous[0].id}::uuid`;
    }
    throw error;
  }
}
