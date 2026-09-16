'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonPicker from '@/components/patients/PersonPicker';
import { GrowthHistory } from '@/components/vitals/GrowthHistory';
import { GrowthTrendChart } from '@/components/vitals/GrowthTrendChart';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useSession } from '@/lib/auth/client';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import { formatCalendarDate, type GrowthMeasurement } from '@/lib/vitals/growth';

type Patient = { id: string; firstName: string; lastName?: string };

function personName(person: Patient) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function GrowthContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { householdId, households, loading: householdsLoading } = useHouseholdContext();
  const requestedId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedId || null);
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [headCircumCm, setHeadCircumCm] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === 'loading' || householdsLoading) return;
    if (!session) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/growth')}`);
      return;
    }
    if (!householdId || households.length === 0) return;

    let active = true;
    void fetch('/api/patients')
      .then(async (response) => {
        const data = await response.json() as Patient[] | { error?: string };
        if (!response.ok) throw new Error((data as { error?: string }).error || 'Could not load family');
        if (!active) return;
        const people = data as Patient[];
        setPatients(people);
        const stored = getLastPatientId();
        const last = stored && people.some((person) => person.id === stored) ? stored : null;
        setLastPatientIdState(last);
        setSelectedId((current) => {
          if (current && people.some((person) => person.id === current)) return current;
          if (requestedId && people.some((person) => person.id === requestedId)) return requestedId;
          return last || people[0]?.id || null;
        });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load family');
      });
    return () => { active = false; };
  }, [householdId, households.length, householdsLoading, requestedId, router, session, status]);

  const loadHistory = useCallback(async (patientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/vitals/growth?patientId=${patientId}`);
      const data = await response.json() as {
        measurements?: GrowthMeasurement[];
        dateOfBirth?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Could not load growth history');
      setMeasurements(data.measurements || []);
      setDateOfBirth(data.dateOfBirth || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load growth history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadHistory(selectedId);
  }, [loadHistory, selectedId]);

  const selectPerson = (id: string) => {
    setLastPatientId(id);
    setLastPatientIdState(id);
    setSelectedId(id);
    setSaved(false);
    router.replace(`/growth?patientId=${id}`, { scroll: false });
  };

  const selected = patients.find((person) => person.id === selectedId);
  const latest = measurements[0];

  const save = async () => {
    if (!selectedId) return;
    const height = heightCm.trim() ? Number.parseFloat(heightCm) : null;
    const weight = weightKg.trim() ? Number.parseFloat(weightKg) : null;
    const head = headCircumCm.trim() ? Number.parseFloat(headCircumCm) : null;
    if (height === null && weight === null && head === null) {
      setError('Enter height, weight, or head circumference');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/vitals/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedId,
          heightCm: height,
          weightKg: weight,
          headCircumCm: head,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await response.json() as {
        measurements?: GrowthMeasurement[];
        dateOfBirth?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setMeasurements(data.measurements || []);
      setDateOfBirth(data.dateOfBirth || null);
      setHeightCm('');
      setWeightKg('');
      setHeadCircumCm('');
      setNotes('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const removeMeasurement = async (id: string) => {
    if (!selectedId || !window.confirm('Remove this measurement?')) return;
    try {
      const response = await fetch(`/api/vitals/growth/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Could not remove');
      }
      await loadHistory(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove');
    }
  };

  if (status === 'loading' || householdsLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/dashboard" className="min-h-11 text-base font-medium text-coral">Family</Link>
          <p className="text-base font-semibold text-gray-950">Height & Weight</p>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {households.length === 0 ? (
          <p className="text-gray-600">Ask a family member to add you to the family folder first.</p>
        ) : (
          <>
            <PersonPicker
              people={patients}
              selectedId={selectedId || undefined}
              lastUsedId={lastPatientId}
              onSelect={selectPerson}
            />

            {selected ? (
              <form
                className="mt-6 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-950">{personName(selected)}</h1>
                  {latest ? (
                    <p className="mt-2 text-base text-gray-600">
                      Last recorded {formatCalendarDate(latest.calendarDate)}
                      {latest.heightCm !== null ? ` · ${latest.heightCm} cm` : ''}
                      {latest.weightKg !== null ? ` · ${latest.weightKg} kg` : ''}
                    </p>
                  ) : (
                    <p className="mt-2 text-base text-gray-600">Track growth at each clinic visit or check-up.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-base font-medium text-gray-800">
                    Height (cm)
                    <input
                      inputMode="decimal"
                      value={heightCm}
                      onChange={(event) => setHeightCm(event.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-4 text-2xl text-gray-950"
                      placeholder="98"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-base font-medium text-gray-800">
                    Weight (kg)
                    <input
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(event) => setWeightKg(event.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-4 text-2xl text-gray-950"
                      placeholder="14.2"
                      autoComplete="off"
                    />
                  </label>
                </div>

                <label className="block text-base font-medium text-gray-800">
                  Head circumference (cm, optional for babies)
                  <input
                    inputMode="decimal"
                    value={headCircumCm}
                    onChange={(event) => setHeadCircumCm(event.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-xl text-gray-950"
                    placeholder="45"
                    autoComplete="off"
                  />
                </label>

                <label className="block text-base font-medium text-gray-800">
                  Notes (optional)
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                    placeholder="e.g. measured at paediatrician"
                  />
                </label>

                {error ? <p className="text-base text-red-700" role="alert">{error}</p> : null}
                {saved ? <p className="text-base text-green-800">Saved.</p> : null}

                <button
                  type="submit"
                  disabled={saving || (!heightCm && !weightKg && !headCircumCm)}
                  className="flex min-h-14 w-full items-center justify-center rounded-xl bg-coral text-lg font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save measurement'}
                </button>
              </form>
            ) : null}

            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-950">Trend</h2>
              <div className="mt-3">
                {loading ? (
                  <p className="text-gray-600" role="status">Loading trend…</p>
                ) : (
                  <GrowthTrendChart measurements={measurements} />
                )}
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-950">History</h2>
              <div className="mt-3">
                {loading ? (
                  <p className="text-gray-600" role="status">Loading history…</p>
                ) : (
                  <GrowthHistory
                    measurements={measurements}
                    dateOfBirth={dateOfBirth}
                    onDelete={(id) => void removeMeasurement(id)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function GrowthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>}>
      <GrowthContent />
    </Suspense>
  );
}
