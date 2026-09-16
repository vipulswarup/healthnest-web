'use client';

import { useRef, useState } from 'react';
import type { CatalogueProduct, MedicationCountry, MedicationIngredient } from '@/lib/medications/ui-types';

export type MedicationExtractionResult = {
  brandName: string | null;
  purchaseCountry: MedicationCountry | null;
  formulation: string | null;
  ingredients: MedicationIngredient[];
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  confidence: number;
  catalogueMatches: CatalogueProduct[];
};

type Props = {
  country: MedicationCountry;
  disabled?: boolean;
  onExtracted: (data: MedicationExtractionResult) => void;
  onError: (message: string) => void;
};

export function MedicationPhotoCapture({ country, disabled, onExtracted, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setScanning(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('country', country);
      const response = await fetch('/api/medications/extract-from-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not read the medicine photo');
      onExtracted(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read the medicine photo');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-coral/40 bg-blue-50/60 p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || scanning}
        onChange={handleFileChange}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Photo of medicine</p>
          <p className="mt-1 text-sm text-gray-600">
            Take a picture of the strip or pack. We will read the brand, salt, and strength for you to confirm.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || scanning}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-60"
        >
          {scanning ? 'Reading photo…' : 'Take photo'}
        </button>
      </div>
    </div>
  );
}
