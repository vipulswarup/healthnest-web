'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNav from '@/components/layout/AppNav';
import { MedicationFormFields } from '@/components/medications/MedicationFormFields';
import { MedicationPhotoCapture, type MedicationExtractionResult } from '@/components/medications/MedicationPhotoCapture';
import { useSession } from '@/lib/auth/client';
import {
  buildCompositionPayload,
  countryLabels,
  defaultFormValues,
  formValuesFromMedication,
  genericName,
  type CatalogueProduct,
  type Medication,
  type MedicationFormValues,
  type Patient,
} from '@/lib/medications/ui-types';
import { useToast } from '@/components/ui/ToastProvider';

function normalizedBrand(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isBrandOnlyEntry(values: MedicationFormValues) {
  return !values.selectedProduct
    && !values.formulation.trim()
    && values.ingredients.every((ingredient) => (
      !ingredient.canonicalInn.trim() && !ingredient.strength.trim()
    ));
}

function autoResolvableCandidate(brandName: string, candidates: CatalogueProduct[]) {
  if (candidates.length === 1) return candidates[0];
  const normalized = normalizedBrand(brandName);
  return candidates.find((candidate) => normalizedBrand(candidate.brandName) === normalized) || null;
}

function MedicationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const requestedPatientId = searchParams.get('patientId') || '';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(requestedPatientId);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState<MedicationFormValues>(defaultFormValues());
  const [candidates, setCandidates] = useState<CatalogueProduct[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extractionHint, setExtractionHint] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const formValuesRef = useRef(formValues);

  const activeCount = useMemo(() => medications.filter((medication) => medication.isActive).length, [medications]);
  const unconfirmedCount = useMemo(
    () => medications.filter((medication) => medication.composition.requiresWarning).length,
    [medications],
  );
  const editingMedication = medications.find((medication) => medication.id === editingId) || null;

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) {
      router.push('/auth/signin');
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/patients');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load patients');
        if (cancelled) return;
        setPatients(data);
        const nextPatientId = requestedPatientId && data.some((patient: Patient) => patient.id === requestedPatientId)
          ? requestedPatientId
          : data[0]?.id || '';
        setPatientId(nextPatientId);
        if (nextPatientId && nextPatientId !== requestedPatientId) {
          router.replace(`/medications?patientId=${nextPatientId}`, { scroll: false });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load patients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [requestedPatientId, router, session?.user?.id, status]);

  useEffect(() => {
    if (!patientId) {
      setMedications([]);
      return;
    }
    void loadMedications(patientId);
  }, [patientId]);

  useEffect(() => {
    if (editingId) return;
    if (formValues.brandName.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const currentValues = formValuesRef.current;
        const response = await fetch(
          `/api/medication-catalog/search?country=${currentValues.country}&q=${encodeURIComponent(currentValues.brandName.trim())}`,
        );
        const nextCandidates = response.ok ? await response.json() as CatalogueProduct[] : [];
        setCandidates(nextCandidates);
        if (!editingId && isBrandOnlyEntry(currentValues)) {
          const match = autoResolvableCandidate(currentValues.brandName.trim(), nextCandidates);
          if (match) {
            setFormValues({
              ...currentValues,
              brandName: match.brandName,
              formulation: match.formulation,
              ingredients: match.ingredients,
              selectedProduct: match,
            });
            setExtractionHint(`Composition filled from the verified catalogue for ${match.brandName}. Check dose and frequency before saving.`);
          }
        }
      } catch {
        setCandidates([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [formValues.brandName, formValues.country, editingId]);

  async function loadMedications(id: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/medications?patientId=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load medications');
      setMedications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load medications');
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setFormValues(defaultFormValues());
    setCandidates([]);
    setExtractionHint(null);
    setShowAddForm(true);
  }

  function closeForms() {
    setShowAddForm(false);
    setEditingId(null);
    setFormValues(defaultFormValues());
    setCandidates([]);
    setExtractionHint(null);
  }

  function applyExtraction(data: MedicationExtractionResult) {
    setShowAddForm(true);
    setEditingId(null);
    setFormValues((current) => ({
      ...current,
      brandName: data.brandName || current.brandName,
      country: data.purchaseCountry || current.country,
      formulation: data.formulation || current.formulation,
      ingredients: data.ingredients.length ? data.ingredients : current.ingredients,
      dosage: data.dosage || current.dosage,
      frequency: data.frequency || current.frequency,
      route: data.route || current.route,
      selectedProduct: null,
    }));
    setCandidates(data.catalogueMatches);
    const confidencePct = Math.round(data.confidence * 100);
    setExtractionHint(
      data.brandName
        ? `Read from photo (${confidencePct}% confident): ${data.brandName}. Check brand, salt, and strength before saving.`
        : 'Could not read a brand name from the photo. Enter details manually.',
    );
    notify('Photo read. Please confirm the details.', 'success');
  }

  async function createMedication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) return;
    try {
      setSaving(true);
      setError('');
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          name: formValues.brandName,
          purchaseCountry: formValues.country,
          dosage: formValues.dosage,
          frequency: formValues.frequency,
          route: formValues.route,
          startDate: formValues.startDate,
          endDate: formValues.isActive ? null : (formValues.endDate || null),
          instructions: formValues.instructions,
          indication: formValues.indication,
          isActive: formValues.isActive,
          stoppedReason: formValues.isActive ? undefined : formValues.stoppedReason,
          composition: buildCompositionPayload(formValues),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save medication');
      closeForms();
      await loadMedications(patientId);
      notify('Medication saved.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save medication');
    } finally {
      setSaving(false);
    }
  }

  async function updateMedication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId || !editingId) return;
    try {
      setSaving(true);
      setError('');
      const response = await fetch(`/api/medications/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formValues.brandName,
          originalBrandName: formValues.brandName,
          purchaseCountry: formValues.country,
          dosage: formValues.dosage,
          frequency: formValues.frequency,
          route: formValues.route,
          startDate: formValues.startDate,
          endDate: formValues.isActive ? null : (formValues.endDate || new Date().toISOString().slice(0, 10)),
          instructions: formValues.instructions,
          indication: formValues.indication,
          isActive: formValues.isActive,
          stoppedReason: formValues.isActive ? '' : formValues.stoppedReason,
          composition: buildCompositionPayload(formValues),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update medication');
      closeForms();
      await loadMedications(patientId);
      notify('Medication updated.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update medication');
    } finally {
      setSaving(false);
    }
  }

  async function suspendMedication(medication: Medication) {
    const reason = window.prompt('Why is this medication being stopped? (optional)') || '';
    if (!patientId) return;
    try {
      setActionId(medication.id);
      const response = await fetch(`/api/medications/${medication.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: false,
          stoppedReason: reason,
          endDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not suspend medication');
      await loadMedications(patientId);
      notify('Medication marked as stopped.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suspend medication');
    } finally {
      setActionId(null);
    }
  }

  async function deleteMedication(medication: Medication) {
    if (!window.confirm(`Delete ${medication.originalBrandName} from the list? This cannot be undone.`)) return;
    if (!patientId) return;
    try {
      setActionId(medication.id);
      const response = await fetch(`/api/medications/${medication.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete medication');
      if (editingId === medication.id) closeForms();
      await loadMedications(patientId);
      notify('Medication deleted.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete medication');
    } finally {
      setActionId(null);
    }
  }

  function startEdit(medication: Medication) {
    setShowAddForm(false);
    setEditingId(medication.id);
    setFormValues(formValuesFromMedication(medication));
    setCandidates([]);
    setExtractionHint(null);
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-600">Loading medications…</p></div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Medications</h1>
              <p className="mt-1 text-gray-600">Photograph a medicine pack or enter details manually. Edit, suspend, or remove entries anytime.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {patientId && (
                <Link href={`/medications/report?patientId=${patientId}`} className="rounded-lg border border-coral px-4 py-2 text-sm font-medium text-coral hover:bg-blue-50">
                  Doctor-facing list
                </Link>
              )}
              {patientId && !showAddForm && !editingId && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong"
                >
                  Add medication
                </button>
              )}
            </div>
          </div>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

          {patients.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">Add a Person before recording medicines.</p>
              <Link href="/patients/new" className="mt-4 inline-block text-coral hover:underline">Add a Person</Link>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <label htmlFor="medication-patient" className="block text-sm font-medium text-gray-700">Person</label>
                <select
                  id="medication-patient"
                  value={patientId}
                  onChange={(event) => {
                    setPatientId(event.target.value);
                    closeForms();
                    router.replace(`/medications?patientId=${event.target.value}`, { scroll: false });
                  }}
                  className="mt-2 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName || ''}</option>
                  ))}
                </select>
                <p className="mt-3 text-sm text-gray-600">{activeCount} active medication{activeCount === 1 ? '' : 's'} recorded.</p>
              </section>

              {patientId && !showAddForm && !editingId && (
                <MedicationPhotoCapture
                  country={formValues.country}
                  onExtracted={applyExtraction}
                  onError={(message) => setError(message)}
                />
              )}

              {showAddForm && (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900">Add medication</h2>
                  <p className="mt-1 text-sm text-gray-600">Confirm brand, salt, and strength before saving.</p>
                  <div className="mt-6">
                    <MedicationFormFields
                      values={formValues}
                      candidates={candidates}
                      saving={saving}
                      submitLabel="Save medication"
                      onChange={setFormValues}
                      onSubmit={createMedication}
                      onCancel={closeForms}
                      extractionHint={extractionHint}
                      photoCapture={(
                        <MedicationPhotoCapture
                          country={formValues.country}
                          disabled={saving}
                          onExtracted={applyExtraction}
                          onError={(message) => setError(message)}
                        />
                      )}
                    />
                  </div>
                </section>
              )}

              {editingId && editingMedication && (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900">Edit medication</h2>
                  <p className="mt-1 text-sm text-gray-600">Update details if the doctor changed the medicine or the photo read the name wrong.</p>
                  <div className="mt-6">
                    <MedicationFormFields
                      values={formValues}
                      candidates={candidates}
                      saving={saving}
                      submitLabel="Save changes"
                      onChange={setFormValues}
                      onSubmit={updateMedication}
                      onCancel={closeForms}
                    />
                  </div>
                </section>
              )}

              <section className="rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="text-xl font-semibold text-gray-900">Medication list</h2>
                {unconfirmedCount > 0 ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    {unconfirmedCount} medicine{unconfirmedCount === 1 ? '' : 's'} {unconfirmedCount === 1 ? 'has' : 'have'} an unconfirmed composition. Confirm from the catalogue before relying on the salt or strength.
                  </p>
                ) : null}
                <div className="mt-5 space-y-3">
                  {medications.length === 0 ? (
                    <p className="py-6 text-center text-gray-500">No medications recorded for this person. Take a photo above to add the first one.</p>
                  ) : medications.map((medication) => (
                    <article
                      key={medication.id}
                      className={`rounded-xl border p-4 ${medication.composition.requiresWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {medication.originalBrandName}
                            <span className="text-sm font-normal text-gray-500">
                              {' '}({medication.purchaseCountry ? countryLabels[medication.purchaseCountry] : 'Country not recorded'})
                            </span>
                          </h3>
                          <p className="mt-1 text-sm text-gray-700">
                            {medication.composition.ingredients.length ? genericName(medication.composition.ingredients) : 'Generic composition not recorded'}
                            {medication.composition.formulation ? ` · ${medication.composition.formulation}` : ''}
                          </p>
                          {medication.indication && <p className="mt-1 text-sm text-gray-600">For: {medication.indication}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {medication.composition.requiresWarning ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Unconfirmed</span>
                          ) : null}
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${medication.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {medication.isActive ? 'Active' : 'Stopped'}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-gray-600">{medication.dosage} · {medication.frequency} · {medication.route}</p>
                      {medication.instructions && <p className="mt-1 text-sm text-gray-600">Original instructions: {medication.instructions}</p>}
                      {!medication.isActive && medication.stoppedReason && (
                        <p className="mt-1 text-sm text-gray-600">Stopped because: {medication.stoppedReason}</p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(medication)}
                          disabled={actionId === medication.id}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Edit
                        </button>
                        {medication.isActive && (
                          <button
                            type="button"
                            onClick={() => void suspendMedication(medication)}
                            disabled={actionId === medication.id}
                            className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60"
                          >
                            {actionId === medication.id ? 'Stopping…' : 'Suspend'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteMedication(medication)}
                          disabled={actionId === medication.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-600" role="status">Loading medications…</div>}>
      <MedicationsContent />
    </Suspense>
  );
}
