'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNav from '@/components/layout/AppNav';
import PersonPicker from '@/components/patients/PersonPicker';
import { BloodPressureWeek } from '@/components/vitals/BloodPressureWeek';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useSession } from '@/lib/auth/client';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import { inferPeriod, periodLabel, type BpDaySlot, type BpPeriod } from '@/lib/vitals/blood-pressure';

type Patient = { id: string; firstName: string; lastName?: string };

function personName(person: Patient) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function LogBpContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { householdId, households, loading: householdsLoading } = useHouseholdContext();
  const requestedId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedId || null);
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);
  const [days, setDays] = useState<BpDaySlot[]>([]);
  const [period, setPeriod] = useState<BpPeriod>(inferPeriod());
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === 'loading' || householdsLoading) return;
    if (!session) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/bp')}`);
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

  const loadWeek = useCallback(async (patientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/vitals/blood-pressure?patientId=${patientId}`);
      const data = await response.json() as { days?: BpDaySlot[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not load blood pressure');
      setDays(data.days || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load blood pressure');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadWeek(selectedId);
  }, [loadWeek, selectedId]);

  const selectPerson = (id: string) => {
    setLastPatientId(id);
    setLastPatientIdState(id);
    setSelectedId(id);
    setSaved(false);
    router.replace(`/bp?patientId=${id}`, { scroll: false });
  };

  const selected = patients.find((person) => person.id === selectedId);

  const save = async () => {
    if (!selectedId) return;
    const sys = Number.parseInt(systolic, 10);
    const dia = Number.parseInt(diastolic, 10);
    const pulseValue = pulse.trim() ? Number.parseInt(pulse, 10) : null;
    if (!Number.isFinite(sys) || !Number.isFinite(dia)) {
      setError('Enter systolic and diastolic');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/vitals/blood-pressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedId,
          systolic: sys,
          diastolic: dia,
          pulse: pulseValue,
          period,
        }),
      });
      const data = await response.json() as { days?: BpDaySlot[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setDays(data.days || []);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || householdsLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />

      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-950">Log BP</h1>
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
                <h2 className="text-3xl font-bold tracking-tight text-gray-950">{personName(selected)}</h2>
                <fieldset>
                  <legend className="text-base font-medium text-gray-800">Time of day</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['morning', 'afternoon', 'evening', 'other'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPeriod(value)}
                        className={`min-h-12 rounded-xl border px-3 text-base font-medium ${
                          period === value
                            ? 'border-coral bg-blue-50 text-[#D96C3D]'
                            : 'border-gray-300 bg-white text-gray-800'
                        }`}
                      >
                        {periodLabel(value)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-base font-medium text-gray-800">
                    Systolic
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={systolic}
                      onChange={(event) => setSystolic(event.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-4 text-3xl text-gray-950"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-base font-medium text-gray-800">
                    Diastolic
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={diastolic}
                      onChange={(event) => setDiastolic(event.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-4 text-3xl text-gray-950"
                      autoComplete="off"
                    />
                  </label>
                </div>

                <label className="block text-base font-medium text-gray-800">
                  Pulse (optional)
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pulse}
                    onChange={(event) => setPulse(event.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-2xl text-gray-950"
                    autoComplete="off"
                  />
                </label>

                {error ? <p className="text-base text-red-700" role="alert">{error}</p> : null}
                {saved ? <p className="text-base text-green-800">Saved.</p> : null}

                <button
                  type="submit"
                  disabled={saving || !systolic || !diastolic}
                  className="flex min-h-14 w-full items-center justify-center rounded-xl bg-coral text-lg font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </form>
            ) : null}

            <div className="mt-10">
              {loading ? <p className="text-gray-600" role="status">Loading week…</p> : <BloodPressureWeek days={days} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function LogBpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>}>
      <LogBpContent />
    </Suspense>
  );
}
