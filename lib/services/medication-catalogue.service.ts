import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import type { MedicationIngredientInput } from '@/lib/services/medication.service';

const countrySchema = z.enum(['IN', 'US', 'GB']);
const ingredientSchema = z.object({
  canonicalInn: z.string().min(1).max(160),
  localAlias: z.string().max(160).optional().nullable(),
  strength: z.string().min(1).max(80),
  strengthUnit: z.string().min(1).max(32),
});
const feedProductSchema = z.object({
  country: countrySchema,
  brandName: z.string().min(1).max(160),
  formulation: z.string().min(1).max(160),
  externalId: z.string().min(1).max(200),
  displayRank: z.number().int().positive().max(100000).default(100),
  sourceReference: z.string().url().max(1000).optional().nullable(),
  discontinued: z.boolean().default(false),
  ingredients: z.array(ingredientSchema).min(1).max(12),
});
export const medicationCatalogueFeedSchema = z.object({
  sourceName: z.string().min(1).max(160),
  sourceVersion: z.string().min(1).max(160),
  products: z.array(feedProductSchema).min(1).max(5000),
});

type Feed = z.infer<typeof medicationCatalogueFeedSchema>;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function sameIngredients(left: MedicationIngredientInput[], right: MedicationIngredientInput[]): boolean {
  return left.length === right.length && left.every((ingredient, index) => {
    const other = right[index];
    return normalized(ingredient.canonicalInn) === normalized(other.canonicalInn)
      && normalized(ingredient.strength) === normalized(other.strength)
      && normalized(ingredient.strengthUnit) === normalized(other.strengthUnit);
  });
}

async function addIngredients(productId: string, ingredients: MedicationIngredientInput[]): Promise<void> {
  await Promise.all(ingredients.map((ingredient, index) => sql`
    INSERT INTO medication_catalog_product_ingredients (
      product_id, canonical_inn, local_alias, strength, strength_unit, ingredient_order
    ) VALUES (
      ${productId}::uuid, ${ingredient.canonicalInn}, ${ingredient.localAlias || null},
      ${ingredient.strength}, ${ingredient.strengthUnit}, ${index + 1}
    )
  `));
}

/**
 * Applies an already licensed and normalized source export. A changed
 * composition is flagged rather than overwritten, so existing patient snapshots
 * retain a visible safety warning until the source discrepancy is resolved.
 */
export async function reconcileMedicationCatalogue(feed: Feed): Promise<{ created: number; verified: number; flagged: number; promoted: number }> {
  let created = 0;
  let verified = 0;
  let flagged = 0;
  let promoted = 0;

  for (const product of feed.products) {
    const [existing] = await sql`
      SELECT id
      FROM medication_catalog_products
      WHERE country = ${product.country}
        AND source_name = ${feed.sourceName}
        AND external_id = ${product.externalId}
      LIMIT 1
    `;
    if (!existing) {
      const [createdProduct] = await sql`
        INSERT INTO medication_catalog_products (
          country, brand_name, normalized_brand_name, formulation, source_name,
          source_version, source_reference, external_id, display_rank, review_status, reviewed_at, discontinued
        ) VALUES (
          ${product.country}, ${product.brandName}, ${normalized(product.brandName)}, ${product.formulation},
          ${feed.sourceName}, ${feed.sourceVersion}, ${product.sourceReference || null}, ${product.externalId}, ${product.displayRank},
          'VERIFIED', NOW(), ${product.discontinued}
        ) RETURNING id
      `;
      await addIngredients(String(createdProduct.id), product.ingredients);
      created += 1;
    } else {
      const ingredientRows = await sql`
        SELECT canonical_inn, local_alias, strength, strength_unit
        FROM medication_catalog_product_ingredients
        WHERE product_id = ${existing.id}::uuid
        ORDER BY ingredient_order ASC
      `;
      const existingIngredients = ingredientRows.map((ingredient) => ({
        canonicalInn: String(ingredient.canonical_inn),
        localAlias: ingredient.local_alias ? String(ingredient.local_alias) : null,
        strength: String(ingredient.strength),
        strengthUnit: String(ingredient.strength_unit),
      }));
      if (sameIngredients(existingIngredients, product.ingredients)) {
        await sql`
          UPDATE medication_catalog_products SET
            brand_name = ${product.brandName}, normalized_brand_name = ${normalized(product.brandName)},
            formulation = ${product.formulation}, source_version = ${feed.sourceVersion},
            source_reference = ${product.sourceReference || null}, display_rank = ${product.displayRank}, review_status = 'VERIFIED',
            reviewed_at = NOW(), review_notes = NULL, discontinued = ${product.discontinued}, updated_at = NOW()
          WHERE id = ${existing.id}::uuid
        `;
        verified += 1;
      } else {
        await sql`
          UPDATE medication_catalog_products SET
            source_version = ${feed.sourceVersion}, source_reference = ${product.sourceReference || null},
            review_status = 'FLAGGED', reviewed_at = NOW(),
            review_notes = 'The latest source export disagrees with the stored ingredient composition.',
            updated_at = NOW()
          WHERE id = ${existing.id}::uuid
        `;
        flagged += 1;
      }
    }

    const pending = await sql`
      SELECT p.id
      FROM medication_catalog_products p
      WHERE p.country = ${product.country}
        AND p.source_name = 'USER_SUBMISSION'
        AND p.review_status = 'PENDING'
        AND p.normalized_brand_name = ${normalized(product.brandName)}
        AND p.formulation = ${product.formulation}
    `;
    for (const candidate of pending) {
      const candidateIngredients = await sql`
        SELECT canonical_inn, local_alias, strength, strength_unit
        FROM medication_catalog_product_ingredients
        WHERE product_id = ${candidate.id}::uuid
        ORDER BY ingredient_order ASC
      `;
      const mappedIngredients = candidateIngredients.map((ingredient) => ({
        canonicalInn: String(ingredient.canonical_inn),
        localAlias: ingredient.local_alias ? String(ingredient.local_alias) : null,
        strength: String(ingredient.strength),
        strengthUnit: String(ingredient.strength_unit),
      }));
      if (sameIngredients(mappedIngredients, product.ingredients)) {
        await sql`
          DELETE FROM medication_catalog_products
          WHERE id = ${candidate.id}::uuid
        `;
        promoted += 1;
      }
    }
  }
  return { created, verified, flagged, promoted };
}

/** Queues a de-identified user mapping. It stays invisible until a source export agrees with it. */
export async function queueMedicationCatalogueSubmission({
  country,
  brandName,
  formulation,
  ingredients,
}: {
  country: 'IN' | 'US' | 'GB';
  brandName: string;
  formulation: string;
  ingredients: MedicationIngredientInput[];
}): Promise<void> {
  if (!formulation || ingredients.length === 0) return;
  const existing = await sql`
    SELECT p.id
    FROM medication_catalog_products p
    WHERE p.country = ${country}
      AND p.normalized_brand_name = ${normalized(brandName)}
      AND p.formulation = ${formulation}
      AND p.review_status IN ('PENDING', 'VERIFIED')
    LIMIT 1
  `;
  if (existing.length > 0) return;
  const [product] = await sql`
    INSERT INTO medication_catalog_products (
      country, brand_name, normalized_brand_name, formulation, source_name,
      source_version, external_id, review_status
    ) VALUES (
      ${country}, ${brandName}, ${normalized(brandName)}, ${formulation}, 'USER_SUBMISSION',
      ${new Date().toISOString()}, ${crypto.randomUUID()}, 'PENDING'
    ) RETURNING id
  `;
  await addIngredients(String(product.id), ingredients);
}
