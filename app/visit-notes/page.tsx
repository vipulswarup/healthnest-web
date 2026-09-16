'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonPicker from '@/components/patients/PersonPicker';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useSession } from '@/lib/auth/client';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import { formatNoteDate, visitNoteLine, type VisitNote } from '@/lib/visit-notes/format';

type Patient = { id: string; firstName: string; lastName?: string };

function personName(person: Patient) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function todayLocal() {
  return new Date().toISOString().slice(0, 10);
}

function VisitNotesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { householdId, households, loading: householdsLoading } = useHouseholdContext();
  const requestedId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedId || null);
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [nextAppointment, setNextAppointment] = useState('');
  const [noteDate, setNoteDate] = useState(todayLocal());
  const [observed, setObserved] = useState('');
  const [askDoctor, setAskDoctor] = useState('');
  const [pinNew, setPinNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDate, setEditingNoteDate] = useState('');
  const [editingObserved, setEditingObserved] = useState('');
  const [editingAskDoctor, setEditingAskDoctor] = useState('');
  const [editingPinned, setEditingPinned] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);

  useEffect(() => {
    if (status === 'loading' || householdsLoading) return;
    if (!session) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/visit-notes')}`);
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

  const loadNotes = useCallback(async (patientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/visit-notes?patientId=${patientId}`);
      const data = await response.json() as {
        notes?: VisitNote[];
        nextAppointment?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Could not load visit notes');
      setNotes(data.notes || []);
      setNextAppointment(data.nextAppointment || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load visit notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadNotes(selectedId);
  }, [loadNotes, selectedId]);

  const selectPerson = (id: string) => {
    setLastPatientId(id);
    setLastPatientIdState(id);
    setSelectedId(id);
    setSaved(false);
    router.replace(`/visit-notes?patientId=${id}`, { scroll: false });
  };

  const selected = patients.find((person) => person.id === selectedId);

  const saveNote = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/visit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedId,
          noteDate,
          observed,
          askDoctor,
          pinned: pinNew,
        }),
      });
      const data = await response.json() as { notes?: VisitNote[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setNotes(data.notes || []);
      setObserved('');
      setAskDoctor('');
      setPinNew(false);
      setNoteDate(todayLocal());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const saveNextAppointment = async () => {
    if (!selectedId) return;
    setSavingAppointment(true);
    setError('');
    try {
      const current = await fetch(`/api/patients/${selectedId}`);
      const currentBody = await current.json() as { preferences?: Record<string, unknown>; error?: string };
      if (!current.ok) throw new Error(currentBody.error || 'Could not save appointment');
      const response = await fetch(`/api/patients/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            ...(currentBody.preferences || {}),
            nextAppointmentDate: nextAppointment || null,
          },
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save appointment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save appointment');
    } finally {
      setSavingAppointment(false);
    }
  };

  const togglePin = async (note: VisitNote) => {
    setError('');
    try {
      const response = await fetch(`/api/visit-notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      const data = await response.json() as { notes?: VisitNote[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not update note');
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update note');
    }
  };

  const removeNote = async (note: VisitNote) => {
    setError('');
    try {
      const response = await fetch(`/api/visit-notes/${note.id}`, { method: 'DELETE' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not delete note');
      setNotes((current) => current.filter((item) => item.id !== note.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete note');
    }
  };

  const startEdit = (note: VisitNote) => {
    setEditingNoteId(note.id);
    setEditingNoteDate(note.noteDate);
    setEditingObserved(note.observed);
    setEditingAskDoctor(note.askDoctor);
    setEditingPinned(note.pinned);
    setSaved(false);
    setError('');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteDate('');
    setEditingObserved('');
    setEditingAskDoctor('');
    setEditingPinned(false);
  };

  const saveEditedNote = async () => {
    if (!editingNoteId) return;
    if (!editingObserved.trim() && !editingAskDoctor.trim()) {
      setError('Write what you noticed or what to ask the doctor');
      return;
    }
    setUpdatingNote(true);
    setError('');
    try {
      const response = await fetch(`/api/visit-notes/${editingNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteDate: editingNoteDate,
          observed: editingObserved.trim(),
          askDoctor: editingAskDoctor.trim(),
          pinned: editingPinned,
        }),
      });
      const data = await response.json() as { notes?: VisitNote[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not update note');
      setNotes(data.notes || []);
      cancelEdit();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update note');
    } finally {
      setUpdatingNote(false);
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
          <p className="text-base font-semibold text-gray-950">Visit Notes</p>
          <Link href={selectedId ? `/for-the-doctor?patientId=${selectedId}` : '/for-the-doctor'} className="min-h-11 text-sm font-medium text-coral">
            For doctor
          </Link>
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
              <div className="mt-6 space-y-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-950">{personName(selected)}</h1>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h2 className="text-lg font-semibold text-gray-950">Next appointment</h2>
                  <p className="mt-1 text-sm text-gray-600">Shows on the doctor packet when you print or share.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={nextAppointment}
                      onChange={(event) => setNextAppointment(event.target.value)}
                      className="min-h-12 flex-1 rounded-xl border border-gray-300 px-3 text-base text-gray-950"
                    />
                    <button
                      type="button"
                      onClick={() => void saveNextAppointment()}
                      disabled={savingAppointment}
                      className="min-h-12 rounded-xl border border-gray-300 px-4 text-base font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {savingAppointment ? 'Saving…' : 'Save date'}
                    </button>
                  </div>
                </section>

                <form
                  className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveNote();
                  }}
                >
                  <h2 className="text-lg font-semibold text-gray-950">Add a Note</h2>
                  <label className="block text-base font-medium text-gray-800">
                    Date
                    <input
                      type="date"
                      value={noteDate}
                      onChange={(event) => setNoteDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                    />
                  </label>
                  <label className="block text-base font-medium text-gray-800">
                    What we noticed
                    <textarea
                      value={observed}
                      onChange={(event) => setObserved(event.target.value)}
                      rows={3}
                      placeholder="Symptoms, behaviour, side effects…"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                    />
                  </label>
                  <label className="block text-base font-medium text-gray-800">
                    What to ask the doctor
                    <textarea
                      value={askDoctor}
                      onChange={(event) => setAskDoctor(event.target.value)}
                      rows={3}
                      placeholder="Questions for the next visit"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-base text-gray-800">
                    <input type="checkbox" checked={pinNew} onChange={(event) => setPinNew(event.target.checked)} />
                    Pin for the next doctor visit
                  </label>
                  {error ? <p className="text-base text-red-700" role="alert">{error}</p> : null}
                  {saved ? <p className="text-base text-green-800">Saved.</p> : null}
                  <button
                    type="submit"
                    disabled={saving || (!observed.trim() && !askDoctor.trim())}
                    className="flex min-h-14 w-full items-center justify-center rounded-xl bg-coral text-lg font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save note'}
                  </button>
                </form>

                <section>
                  <h2 className="text-lg font-semibold text-gray-950">Recent notes</h2>
                  {loading ? (
                    <p className="mt-3 text-gray-600" role="status">Loading notes…</p>
                  ) : notes.length === 0 ? (
                    <p className="mt-3 text-base text-gray-600">No visit notes yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {notes.map((note) => (
                        <li key={note.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-800">
                                Date
                                <input
                                  type="date"
                                  value={editingNoteDate}
                                  onChange={(event) => setEditingNoteDate(event.target.value)}
                                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                                />
                              </label>
                              <label className="block text-sm font-medium text-gray-800">
                                What we noticed
                                <textarea
                                  value={editingObserved}
                                  onChange={(event) => setEditingObserved(event.target.value)}
                                  rows={3}
                                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                                />
                              </label>
                              <label className="block text-sm font-medium text-gray-800">
                                What to ask the doctor
                                <textarea
                                  value={editingAskDoctor}
                                  onChange={(event) => setEditingAskDoctor(event.target.value)}
                                  rows={3}
                                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-950"
                                />
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-800">
                                <input type="checkbox" checked={editingPinned} onChange={(event) => setEditingPinned(event.target.checked)} />
                                Pin for the next doctor visit
                              </label>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => void saveEditedNote()}
                                  disabled={updatingNote}
                                  className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-60"
                                >
                                  {updatingNote ? 'Saving…' : 'Save changes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={updatingNote}
                                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-500">{formatNoteDate(note.noteDate)}{note.pinned ? ' · Pinned' : ''}</p>
                              {note.observed.trim() ? <p className="mt-2 text-base text-gray-900"><span className="font-medium">Noticed:</span> {note.observed}</p> : null}
                              {note.askDoctor.trim() ? <p className="mt-2 text-base text-gray-900"><span className="font-medium">Ask:</span> {note.askDoctor}</p> : null}
                              <p className="mt-2 text-sm text-gray-600">{visitNoteLine(note)}</p>
                              <div className="mt-3 flex flex-wrap gap-3">
                                <button type="button" onClick={() => startEdit(note)} className="text-sm font-medium text-coral hover:underline">
                                  Edit
                                </button>
                                <button type="button" onClick={() => void togglePin(note)} className="text-sm font-medium text-coral hover:underline">
                                  {note.pinned ? 'Unpin' : 'Pin for visit'}
                                </button>
                                <button type="button" onClick={() => void removeNote(note)} className="text-sm font-medium text-red-700 hover:underline">
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default function VisitNotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>}>
      <VisitNotesContent />
    </Suspense>
  );
}
