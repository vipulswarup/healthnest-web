export type MedicationCountry = 'IN' | 'US' | 'GB';

export type Patient = { id: string; firstName: string; lastName?: string };

export type MedicationIngredient = {
  canonicalInn: string;
  localAlias?: string | null;
  strength: string;
  strengthUnit: string;
};

export type CatalogueProduct = {
  id: string;
  country: MedicationCountry;
  brandName: string;
  formulation: string;
  sourceName: string;
  sourceVersion: string;
  ingredients: MedicationIngredient[];
};

export type Medication = {
  id: string;
  originalBrandName: string;
  purchaseCountry: MedicationCountry | null;
  indication: string;
  stoppedReason: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  instructions: string;
  isActive: boolean;
  composition: {
    status: 'CONFIRMED' | 'UNCONFIRMED' | 'REVIEW_NEEDED';
    formulation: string;
    catalogProductId?: string | null;
    ingredients: MedicationIngredient[];
    requiresWarning: boolean;
  };
};

export type MedicationFormValues = {
  brandName: string;
  country: MedicationCountry;
  formulation: string;
  ingredients: MedicationIngredient[];
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string;
  instructions: string;
  indication: string;
  isActive: boolean;
  stoppedReason: string;
  selectedProduct: CatalogueProduct | null;
};

export const countryLabels: Record<MedicationCountry, string> = {
  IN: 'India',
  US: 'USA',
  GB: 'UK',
};

export function emptyIngredient(): MedicationIngredient {
  return { canonicalInn: '', strength: '', strengthUnit: 'mg' };
}

export function genericName(ingredients: MedicationIngredient[]): string {
  return ingredients
    .map((ingredient) => `${ingredient.canonicalInn} ${ingredient.strength} ${ingredient.strengthUnit}`.trim())
    .join(' + ');
}

export function defaultFormValues(): MedicationFormValues {
  return {
    brandName: '',
    country: 'IN',
    formulation: '',
    ingredients: [emptyIngredient()],
    dosage: '',
    frequency: '',
    route: 'Oral',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    instructions: '',
    indication: '',
    isActive: true,
    stoppedReason: '',
    selectedProduct: null,
  };
}

export function formValuesFromMedication(medication: Medication): MedicationFormValues {
  return {
    brandName: medication.originalBrandName,
    country: medication.purchaseCountry || 'IN',
    formulation: medication.composition.formulation,
    ingredients: medication.composition.ingredients.length
      ? medication.composition.ingredients
      : [emptyIngredient()],
    dosage: medication.dosage,
    frequency: medication.frequency,
    route: medication.route,
    startDate: String(medication.startDate).slice(0, 10),
    endDate: medication.endDate ? String(medication.endDate).slice(0, 10) : '',
    instructions: medication.instructions,
    indication: medication.indication,
    isActive: medication.isActive,
    stoppedReason: medication.stoppedReason,
    selectedProduct: medication.composition.status === 'CONFIRMED' && medication.composition.catalogProductId
      ? {
          id: medication.composition.catalogProductId,
          country: medication.purchaseCountry || 'IN',
          brandName: medication.originalBrandName,
          formulation: medication.composition.formulation,
          sourceName: '',
          sourceVersion: '',
          ingredients: medication.composition.ingredients,
        }
      : null,
  };
}

export function buildCompositionPayload(values: MedicationFormValues) {
  const manualIngredients = values.ingredients.filter(
    (ingredient) => ingredient.canonicalInn.trim() && ingredient.strength.trim() && ingredient.strengthUnit.trim(),
  );
  return values.selectedProduct
    ? { status: 'CONFIRMED' as const, catalogProductId: values.selectedProduct.id }
    : { status: 'UNCONFIRMED' as const, formulation: values.formulation, ingredients: manualIngredients };
}
