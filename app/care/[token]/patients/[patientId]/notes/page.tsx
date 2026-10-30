'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { careApiBase } from '@/lib/care/paths';

type VisitNote = {
  id: string;
  noteDate: string;
  observed: string;
  askDoctor: string;
  pinned: boolean;
};

export default function CareNotesPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [notes, setNotes] = useState<VisitNote[]>([]);
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/notes`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load notes');
        if (!cancelled) {
          setNotes(data.notes || []);
          setNextAppointment(data.nextAppointment || null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load notes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [patientId, token]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Symptoms & notes</h2>
        <p className="mt-1 text-sm text-slate">View only</p>
      </div>

      {nextAppointment ? (
        <p className="rounded-xl border border-blue-200 bg-brand-tint px-4 py-3 text-sm text-ink">
          Next appointment noted: <span className="font-medium">{nextAppointment}</span>
        </p>
      ) : null}

      {loading ? <p className="text-slate" role="status">Loading notes…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}
      {!loading && !error && notes.length === 0 ? (
        <p className="text-sm text-slate">No symptoms or notes recorded.</p>
      ) : null}

      <ul className="space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-xl border border-silver bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-ink">{note.noteDate}</p>
              {note.pinned ? (
                <span className="rounded-full bg-sage/25 px-2 py-0.5 text-xs font-medium text-ink">Pinned</span>
              ) : null}
            </div>
            {note.observed ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">Observed</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{note.observed}</p>
              </div>
            ) : null}
            {note.askDoctor ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">Ask the doctor</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{note.askDoctor}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
