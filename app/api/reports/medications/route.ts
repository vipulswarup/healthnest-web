import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { getAccessiblePatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { listAccessibleMedications, toMedication } from '@/lib/services/medication.service';

const countrySchema = z.enum(['IN', 'US', 'GB']);

type Ingredient = { canonicalInn: string; strength: string; strengthUnit: string };

function isExactComposition(candidate: Ingredient[], composition: Ingredient[], formulation: string, expectedFormulation: string): boolean {
  if (candidate.length !== composition.length || formulation.trim().toLowerCase() !== expectedFormulation.trim().toLowerCase()) return false;
  return candidate.every((ingredient, index) => {
    const expected = composition[index];
    return ingredient.canonicalInn.trim().toLowerCase() === expected.canonicalInn.trim().toLowerCase()
      && ingredient.strength.trim().toLowerCase() === expected.strength.trim().toLowerCase()
      && ingredient.strengthUnit.trim().toLowerCase() === expected.strengthUnit.trim().toLowerCase();
  });
}

async function exactLocalBrands(country: 'IN' | 'US' | 'GB', ingredients: Ingredient[], formulation: string): Promise<string[]> {
  if (ingredients.length === 0 || !formulation) return [];
  const products = await sql`
    SELECT cp.brand_name, cp.formulation, cp.display_rank,
      COALESCE(jsonb_agg(jsonb_build_object(
        'canonicalInn', ci.canonical_inn, 'strength', ci.strength, 'strengthUnit', ci.strength_unit
      ) ORDER BY ci.ingredient_order) FILTER (WHERE ci.id IS NOT NULL), '[]'::jsonb) AS ingredients
    FROM medication_catalog_products cp
    INNER JOIN medication_catalog_product_ingredients first_ingredient
      ON first_ingredient.product_id = cp.id
    LEFT JOIN medication_catalog_product_ingredients ci ON ci.product_id = cp.id
    WHERE cp.country = ${country}
      AND cp.review_status = 'VERIFIED'
      AND cp.discontinued = FALSE
      AND first_ingredient.canonical_inn = ${ingredients[0].canonicalInn}
    GROUP BY cp.id
    ORDER BY cp.display_rank ASC, cp.brand_name ASC
    LIMIT 50
  `;
  return products.flatMap((product) => {
    const productIngredients = Array.isArray(product.ingredients) ? product.ingredients as Ingredient[] : [];
    return isExactComposition(productIngredients, ingredients, String(product.formulation), formulation)
      ? [String(product.brand_name)]
      : [];
  }).slice(0, 3);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const patientId = request.nextUrl.searchParams.get('patientId');
    const country = countrySchema.safeParse(request.nextUrl.searchParams.get('country'));
    if (!patientId || !z.string().uuid().safeParse(patientId).success || !country.success) {
      throw new AppError('A valid patient ID and destination country are required', 400);
    }
    const patient = await getAccessiblePatient(user.id, patientId);
    if (!patient) throw new AppError('Patient not found', 404);

    const rows = await listAccessibleMedications(user.id, patientId, null);
    const medications = await Promise.all(rows.map(async (row) => {
      const medication = toMedication(row);
      const ingredients = medication.composition.ingredients as Ingredient[];
      const localBrands = medication.composition.status === 'CONFIRMED'
        ? await exactLocalBrands(country.data, ingredients, medication.composition.formulation)
        : [];
      return {
        ...medication,
        localBrands,
      };
    }));

    return NextResponse.json({
      destinationCountry: country.data,
      patient: { id: String(patient.id), firstName: String(patient.first_name), lastName: patient.last_name ? String(patient.last_name) : '' },
      active: medications.filter((medication) => medication.isActive),
      past: medications.filter((medication) => !medication.isActive),
    });
  } catch (error) {
    return handleError(error);
  }
}
