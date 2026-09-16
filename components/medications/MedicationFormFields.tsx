'use client';

import type { CatalogueProduct, MedicationFormValues, MedicationIngredient } from '@/lib/medications/ui-types';
import { countryLabels, emptyIngredient, genericName } from '@/lib/medications/ui-types';

type Props = {
  values: MedicationFormValues;
  candidates: CatalogueProduct[];
  saving?: boolean;
  submitLabel: string;
  onChange: (values: MedicationFormValues) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  showPhotoCapture?: boolean;
  photoCapture?: React.ReactNode;
  extractionHint?: string | null;
};

export function MedicationFormFields({
  values,
  candidates,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  photoCapture,
  extractionHint,
}: Props) {
  function updateIngredient(index: number, field: keyof MedicationIngredient, value: string) {
    onChange({
      ...values,
      selectedProduct: null,
      ingredients: values.ingredients.map((ingredient, ingredientIndex) => (
        ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient
      )),
    });
  }

  function chooseCandidate(candidate: CatalogueProduct) {
    onChange({
      ...values,
      brandName: candidate.brandName,
      formulation: candidate.formulation,
      ingredients: candidate.ingredients,
      selectedProduct: candidate,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {photoCapture}
      {extractionHint && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">{extractionHint}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Brand name
          <input
            required
            value={values.brandName}
            onChange={(event) => onChange({ ...values, brandName: event.target.value, selectedProduct: null })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="As written on the medicine"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            If you only know the brand, SanoVault will try to fill the composition from the verified catalogue.
          </span>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Country obtained
          <select
            value={values.country}
            onChange={(event) => onChange({ ...values, country: event.target.value as MedicationFormValues['country'], selectedProduct: null })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {Object.entries(countryLabels).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {candidates.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-950">Verified catalogue matches</p>
          <div className="mt-2 space-y-2">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                onClick={() => chooseCandidate(candidate)}
                className="block w-full rounded-md bg-white p-3 text-left text-sm hover:bg-blue-100"
              >
                <strong>{candidate.brandName}</strong> · {genericName(candidate.ingredients)} · {candidate.formulation}
              </button>
            ))}
          </div>
        </div>
      )}

      {values.selectedProduct ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <strong>Confirmed composition selected:</strong> {genericName(values.ingredients)} · {values.formulation}
          <button
            type="button"
            onClick={() => onChange({ ...values, selectedProduct: null })}
            className="ml-3 font-medium text-coral hover:underline"
          >
            Use unconfirmed entry instead
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">Unconfirmed composition</p>
          <p className="mt-1 text-sm text-amber-900">
            Edit salt and strength if the photo read them wrong. A verified catalogue match confirms the composition.
          </p>
          <label className="mt-3 block text-sm font-medium text-gray-700">
            Formulation
            <input
              value={values.formulation}
              onChange={(event) => onChange({ ...values, formulation: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Tablet, suspension, injection…"
            />
          </label>
          <div className="mt-3 space-y-2">
            {values.ingredients.map((ingredient, index) => (
              <div className="grid gap-2 md:grid-cols-[1fr_8rem_7rem_auto]" key={index}>
                <input
                  value={ingredient.canonicalInn}
                  onChange={(event) => updateIngredient(index, 'canonicalInn', event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="INN / active ingredient"
                />
                <input
                  value={ingredient.strength}
                  onChange={(event) => updateIngredient(index, 'strength', event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Strength"
                />
                <input
                  value={ingredient.strengthUnit}
                  onChange={(event) => updateIngredient(index, 'strengthUnit', event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Unit"
                />
                <button
                  type="button"
                  onClick={() => onChange({
                    ...values,
                    ingredients: values.ingredients.length === 1
                      ? [emptyIngredient()]
                      : values.ingredients.filter((_, itemIndex) => itemIndex !== index),
                  })}
                  className="text-sm text-red-700 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...values, ingredients: [...values.ingredients, emptyIngredient()] })}
            className="mt-3 text-sm font-medium text-coral hover:underline"
          >
            + Add ingredient
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">
          Prescribed dose
          <input required value={values.dosage} onChange={(event) => onChange({ ...values, dosage: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="1 tablet" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Frequency
          <input required value={values.frequency} onChange={(event) => onChange({ ...values, frequency: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Twice daily" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Route
          <input required value={values.route} onChange={(event) => onChange({ ...values, route: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Start date
          <input type="date" required value={values.startDate} onChange={(event) => onChange({ ...values, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Reason for use (optional)
          <input value={values.indication} onChange={(event) => onChange({ ...values, indication: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="e.g. hypertension" />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Original prescription instructions
        <textarea value={values.instructions} onChange={(event) => onChange({ ...values, instructions: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" rows={3} placeholder="Keep wording from the prescription where possible" />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => onChange({ ...values, isActive: event.target.checked })}
          />
          Active medication
        </label>
        {!values.isActive && (
          <>
            <input
              value={values.stoppedReason}
              onChange={(event) => onChange({ ...values, stoppedReason: event.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reason stopped (optional)"
            />
            <label className="text-sm text-gray-700">
              Stop date
              <input
                type="date"
                value={values.endDate}
                onChange={(event) => onChange({ ...values, endDate: event.target.value })}
                className="ml-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button disabled={saving} className="rounded-lg bg-coral px-5 py-2.5 font-medium text-white hover:bg-coral-strong disabled:opacity-60">
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
