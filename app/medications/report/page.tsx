'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import AppNav from '@/components/layout/AppNav';

type Country = 'IN' | 'US' | 'GB';
type Ingredient = { canonicalInn: string; localAlias?: string | null; strength: string; strengthUnit: string };
type Medication = {
  id: string;
  originalBrandName: string;
  purchaseCountry: Country | null;
  indication: string;
  stoppedReason: string;
  dosage: string;
  frequency: string;
  route: string;
  instructions: string;
  isActive: boolean;
  localBrands: string[];
  composition: { formulation: string; ingredients: Ingredient[]; requiresWarning: boolean };
};
type Report = { patient: { firstName: string; lastName: string }; active: Medication[]; past: Medication[] };

const labels: Record<Country, string> = { IN: 'India', US: 'USA', GB: 'UK' };
const genericName = (ingredients: Ingredient[]) => ingredients.map((ingredient) => `${ingredient.canonicalInn} ${ingredient.strength} ${ingredient.strengthUnit}`.trim()).join(' + ');

export default function MedicationReportPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <MedicationReportContent />
    </Suspense>
  );
}

function MedicationReportContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const [country, setCountry] = useState<Country>('IN');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/reports/medications?patientId=${patientId}&country=${country}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not prepare the medication list');
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare the medication list');
    } finally {
      setLoading(false);
    }
  }, [country, patientId]);

  useEffect(() => {
    if (!patientId) {
      setError('Choose a patient from the medication list first.');
      setLoading(false);
      return;
    }
    void load();
  }, [load, patientId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/medications" className="text-sm font-medium text-coral hover:underline">← Back to medications</Link><button onClick={() => window.print()} className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong">Print list</button></div>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5"><div><p className="text-sm font-medium uppercase tracking-wide text-coral">SanoVault medication list</p><h1 className="mt-1 text-3xl font-bold text-gray-900">{report ? `${report.patient.firstName} ${report.patient.lastName}`.trim() : 'Medication list'}</h1><p className="mt-1 text-sm text-gray-600">For clinical review — not prescribing guidance.</p></div><label className="text-sm font-medium text-gray-700 print:hidden">Doctor&apos;s country<select value={country} onChange={(event) => setCountry(event.target.value as Country)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            {loading ? <p className="py-10 text-center text-gray-600">Preparing medication list…</p> : error ? <p className="py-10 text-center text-red-700">{error}</p> : report && <div className="mt-6 space-y-8"><MedicationSection title="Active medications" medications={report.active} country={country} /><MedicationSection title="Past medications" medications={report.past} country={country} /></div>}
          </section>
        </div>
      </main>
    </div>
  );
}

function ReportLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Preparing medication list…</p>
    </div>
  );
}

function MedicationSection({ title, medications, country }: { title: string; medications: Medication[]; country: Country }) {
  return <section><h2 className="text-lg font-semibold text-gray-900">{title}</h2>{medications.length === 0 ? <p className="mt-2 text-sm text-gray-500">None recorded.</p> : <div className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200">{medications.map((medication) => <article key={medication.id} className="p-4"><h3 className="font-semibold text-gray-900">{genericName(medication.composition.ingredients) || medication.originalBrandName}{medication.composition.formulation ? ` · ${medication.composition.formulation}` : ''}</h3><p className="mt-1 text-sm text-gray-700">Dose: {medication.dosage} · {medication.frequency} · {medication.route}</p>{medication.indication && <p className="mt-1 text-sm text-gray-700">Reason for use: {medication.indication}</p>}<p className="mt-2 text-sm text-gray-600">Original brand: {medication.originalBrandName}{medication.purchaseCountry ? ` (${labels[medication.purchaseCountry]})` : ''}</p>{medication.localBrands.length > 0 && <p className="mt-1 text-sm text-gray-600">Exact equivalent brand{medication.localBrands.length === 1 ? '' : 's'} commonly catalogued for {labels[country]}: {medication.localBrands.join(', ')}</p>}{medication.instructions && <p className="mt-1 text-sm text-gray-600">Original instructions: {medication.instructions}</p>}{!medication.isActive && medication.stoppedReason && <p className="mt-1 text-sm text-gray-600">Stopped because: {medication.stoppedReason}</p>}{medication.composition.requiresWarning && <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm font-medium text-amber-900">Warning: the recorded composition has not been confirmed against the shared catalogue. Verify it before relying on this list.</p>}</article>)}</div>}</section>;
}
