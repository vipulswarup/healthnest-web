import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import { AppError } from '@/lib/middleware/error-handler';
import type { MedicationCompositionInput } from '@/lib/services/medication.service';

export const medicationCountrySchema = z.enum(['IN', 'US', 'GB']);
export type MedicationCountry = z.infer<typeof medicationCountrySchema>;

export const medicationIngredientSchema = z.object({
  canonicalInn: z.string().min(1).max(160),
  localAlias: z.string().max(160).optional().nullable(),
  strength: z.string().min(1).max(80),
  strengthUnit: z.string().min(1).max(32),
});

export const medicationCompositionSchema = z.object({
  status: z.enum(['CONFIRMED', 'UNCONFIRMED']).default('UNCONFIRMED'),
  formulation: z.string().max(160).optional().nullable(),
  catalogProductId: z.string().uuid().optional().nullable(),
  ingredients: z.array(medicationIngredientSchema).max(12).default([]),
});

export async function resolveMedicationComposition(
  composition: z.infer<typeof medicationCompositionSchema> | undefined,
  purchaseCountry: MedicationCountry | null | undefined,
): Promise<MedicationCompositionInput> {
  if (!composition || composition.status === 'UNCONFIRMED') {
    return {
      status: 'UNCONFIRMED',
      formulation: composition?.formulation || null,
      ingredients: composition?.ingredients || [],
    };
  }

  if (!composition.catalogProductId) {
    throw new AppError('Choose a verified catalogue product before confirming a composition', 400, 'CATALOGUE_SELECTION_REQUIRED');
  }

  const [product] = await sql`
    SELECT id, country, formulation, source_name, source_version
    FROM medication_catalog_products
    WHERE id = ${composition.catalogProductId}::uuid
      AND review_status = 'VERIFIED'
      AND discontinued = FALSE
  `;
  if (!product || (purchaseCountry && product.country !== purchaseCountry)) {
    throw new AppError('This catalogue product is not available for confirmation', 409, 'CATALOGUE_PRODUCT_UNAVAILABLE');
  }

  const ingredients = await sql`
    SELECT canonical_inn, local_alias, strength, strength_unit
    FROM medication_catalog_product_ingredients
    WHERE product_id = ${product.id}::uuid
    ORDER BY ingredient_order ASC
  `;
  if (ingredients.length === 0) {
    throw new AppError('The selected catalogue product has no verified composition', 409, 'CATALOGUE_COMPOSITION_MISSING');
  }

  return {
    status: 'CONFIRMED',
    catalogProductId: String(product.id),
    formulation: String(product.formulation),
    sourceName: String(product.source_name),
    sourceVersion: String(product.source_version),
    ingredients: ingredients.map((ingredient) => ({
      canonicalInn: String(ingredient.canonical_inn),
      localAlias: ingredient.local_alias ? String(ingredient.local_alias) : null,
      strength: String(ingredient.strength),
      strengthUnit: String(ingredient.strength_unit),
    })),
  };
}
