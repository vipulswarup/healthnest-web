'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonPicker from '@/components/patients/PersonPicker';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useSession } from '@/lib/auth/client';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import {
  COMMON_VACCINES,
  formatVaccineDate,
  vaccinationLine,
  type Vaccination,
} from '@/lib/vaccinations/format';

type Patient = { id: string; firstName: string; lastName?: string };
type Upcoming = { id: string; vaccineName: string; doseLabel: string; nextDueDate: string };

function personName(person: Patient) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

function VaccinationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { householdId, households, loading: householdsLoading } = useHouseholdContext();
  const requestedId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedId || null);
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [vaccineName, setVaccineName] = useState('');
  const [doseLabel, setDoseLabel] = useState('');
  const [administeredDate, setAdministeredDate] = useState(todayLocal());
  const [provider, setProvider] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading' || householdsLoading) return;
    if (!session) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/vaccinations')}`);
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

  const loadVaccinations = useCallback(async (patientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/vaccinations?patientId=${patientId}`);
      const data = await response.json() as {
        vaccinations?: Vaccination[];
        upcoming?: Upcoming[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Could not load vaccinations');
      setVaccinations(data.vaccinations || []);
      setUpcoming(data.upcoming || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vaccinations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadVaccinations(selectedId);
  }, [loadVaccinations, selectedId]);

  const selectPerson = (id: string) => {
    setLastPatientId(id);
    setLastPatientIdState(id);
    setSelectedId(id);
    setSaved(false);
    setEditingId(null);
    resetForm();
    router.replace(`/vaccinations?patientId=${id}`, { scroll: false });
  };

  const selected = patients.find((person) => person.id === selectedId);

  function resetForm() {
    setVaccineName('');
    setDoseLabel('');
    setAdministeredDate(todayLocal());
    setProvider('');
    setNextDueDate('');
    setNotes('');
  }

  function startEdit(vaccination: Vaccination) {
    setEditingId(vaccination.id);
    setVaccineName(vaccination.vaccineName);
    setDoseLabel(vaccination.doseLabel);
    setAdministeredDate(vaccination.administeredDate);
    setProvider(vaccination.provider);
    setNextDueDate(vaccination.nextDueDate || '');
    setNotes(vaccination.notes);
    setSaved(false);
    setError('');
  }

  const save = async () => {
    if (!selectedId || !vaccineName.trim()) {
      setError('Enter the vaccine name');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        patientId: selectedId,
        vaccineName: vaccineName.trim(),
        doseLabel: doseLabel.trim() || undefined,
        administeredDate,
        provider: provider.trim() || undefined,
        nextDueDate: nextDueDate || null,
        notes: notes.trim() || undefined,
      };
      const response = await fetch(editingId ? `/api/vaccinations/${editingId}` : '/api/vaccinations', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as {
        vaccinations?: Vaccination[];
        upcoming?: Upcoming[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setVaccinations(data.vaccinations || []);
      setUpcoming(data.upcoming || []);
      setEditingId(null);
      resetForm();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!selectedId || !window.confirm('Delete this vaccination record?')) return;
    try {
      const response = await fetch(`/api/vaccinations/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Could not delete');
      }
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
      await loadVaccinations(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
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
          <p className="text-base font-semibold text-gray-950">Vaccinations</p>
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
              <>
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-950">{personName(selected)}</h1>
                <p className="mt-2 text-base text-gray-600">Keep a simple vaccination history for school and clinic visits.</p>

                {upcoming.length > 0 && (
                  <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">Coming up</h2>
                    <ul className="mt-2 space-y-1 text-sm text-amber-950">
                      {upcoming.map((item) => (
                        <li key={item.id}>
                          {item.vaccineName}{item.doseLabel ? ` (${item.doseLabel})` : ''} · due {formatVaccineDate(item.nextDueDate)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <form
                  className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                >
                  <h2 className="text-lg font-semibold text-gray-950">{editingId ? 'Edit vaccination' : 'Add vaccination'}</h2>

                  <label className="block text-base font-medium text-gray-800">
                    Vaccine
                    <input
                      list="vaccine-suggestions"
                      required
                      value={vaccineName}
                      onChange={(event) => setVaccineName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                      placeholder="e.g. MMR"
                    />
                    <datalist id="vaccine-suggestions">
                      {COMMON_VACCINES.map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-base font-medium text-gray-800">
                      Dose (optional)
                      <input
                        value={doseLabel}
                        onChange={(event) => setDoseLabel(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
                        placeholder="Dose 1, Booster…"
                      />
                    </label>
                    <label className="block text-base font-medium text-gray-800">
                      Date given
                      <input
                        type="date"
                        required
                        value={administeredDate}
                        onChange={(event) => setAdministeredDate(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
                      />
                    </label>
                  </div>

                  <label className="block text-base font-medium text-gray-800">
                    Clinic / hospital (optional)
                    <input
                      value={provider}
                      onChange={(event) => setProvider(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
                    />
                  </label>

                  <label className="block text-base font-medium text-gray-800">
                    Next dose due (optional)
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(event) => setNextDueDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
                    />
                  </label>

                  <label className="block text-base font-medium text-gray-800">
                    Notes (optional)
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
                    />
                  </label>

                  {error ? <p className="text-base text-red-700" role="alert">{error}</p> : null}
                  {saved ? <p className="text-base text-green-800">Saved.</p> : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-coral px-5 py-3 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add vaccination'}
                    </button>
                    {editingId ? (
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); resetForm(); }}
                        className="rounded-xl border border-gray-300 px-5 py-3 text-base font-medium text-gray-800"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                </form>

                <section className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-950">Vaccination history</h2>
                  {loading ? (
                    <p className="mt-3 text-gray-600" role="status">Loading…</p>
                  ) : vaccinations.length === 0 ? (
                    <p className="mt-3 text-gray-600">No vaccinations recorded yet.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                      {vaccinations.map((vaccination) => (
                        <li key={vaccination.id} className="px-4 py-3">
                          <p className="text-base font-medium text-gray-900">{vaccinationLine(vaccination)}</p>
                          {vaccination.nextDueDate ? (
                            <p className="mt-1 text-sm text-gray-600">Next due {formatVaccineDate(vaccination.nextDueDate)}</p>
                          ) : null}
                          {vaccination.notes ? <p className="mt-1 text-sm text-gray-600">{vaccination.notes}</p> : null}
                          <div className="mt-2 flex gap-3">
                            <button type="button" onClick={() => startEdit(vaccination)} className="text-sm text-coral hover:underline">Edit</button>
                            <button type="button" onClick={() => void remove(vaccination.id)} className="text-sm text-red-700 hover:underline">Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default function VaccinationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>}>
      <VaccinationsContent />
    </Suspense>
  );
}
