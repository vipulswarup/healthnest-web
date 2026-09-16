import { sql } from '@/lib/db/neon';
import type { MedicationCountry } from '@/lib/medications/schemas';

export type CatalogueProductResult = {
  id: string;
  country: string;
  brandName: string;
  formulation: string;
  sourceName: string;
  sourceVersion: string;
  ingredients: Array<{
    canonicalInn: string;
    localAlias?: string | null;
    strength: string;
    strengthUnit: string;
  }>;
};

export async function searchVerifiedCatalogueProducts(
  country: MedicationCountry,
  query: string,
  limit = 12,
): Promise<CatalogueProductResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const products = await sql`
    SELECT
      cp.id, cp.country, cp.brand_name, cp.formulation, cp.source_name, cp.source_version,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'canonicalInn', ci.canonical_inn,
            'localAlias', ci.local_alias,
            'strength', ci.strength,
            'strengthUnit', ci.strength_unit
          ) ORDER BY ci.ingredient_order
        ) FILTER (WHERE ci.id IS NOT NULL),
        '[]'::jsonb
      ) AS ingredients
    FROM medication_catalog_products cp
    LEFT JOIN medication_catalog_product_ingredients ci ON ci.product_id = cp.id
    WHERE cp.country = ${country}
      AND cp.review_status = 'VERIFIED'
      AND cp.discontinued = FALSE
      AND cp.normalized_brand_name LIKE ${`%${trimmed.toLowerCase()}%`}
    GROUP BY cp.id
    ORDER BY cp.display_rank ASC, cp.brand_name ASC
    LIMIT ${limit}
  `;

  return products.map((product) => ({
    id: String(product.id),
    country: String(product.country),
    brandName: String(product.brand_name),
    formulation: String(product.formulation),
    sourceName: String(product.source_name),
    sourceVersion: String(product.source_version),
    ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
  }));
}
