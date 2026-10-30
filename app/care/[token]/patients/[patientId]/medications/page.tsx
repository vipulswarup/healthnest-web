'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { careApiBase } from '@/lib/care/paths';

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  indication: string;
  instructions: string;
  prescribedBy: string;
};

function day(value: unknown) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function CareMedicationsPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [medications, setMedications] = useState<Medication[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/medications`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load medicines');
        if (!cancelled) setMedications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load medicines');
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
        <h2 className="text-lg font-semibold text-ink">Medicines</h2>
        <p className="mt-1 text-sm text-slate">View only</p>
      </div>

      {loading ? <p className="text-slate" role="status">Loading medicines…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}
      {!loading && !error && medications.length === 0 ? (
        <p className="text-sm text-slate">No medicines recorded.</p>
      ) : null}

      <ul className="space-y-3">
        {medications.map((med) => (
          <li key={med.id} className="rounded-xl border border-silver bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-ink">{med.name}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                med.isActive ? 'bg-sage/25 text-ink' : 'bg-cream text-slate'
              }`}>
                {med.isActive ? 'Active' : 'Stopped'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate">
              {[med.dosage, med.frequency, med.route].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-2 text-sm text-slate">
              {[day(med.startDate) && `From ${day(med.startDate)}`, day(med.endDate) && `to ${day(med.endDate)}`]
                .filter(Boolean)
                .join(' ')}
            </p>
            {med.indication ? <p className="mt-2 text-sm text-ink">For: {med.indication}</p> : null}
            {med.instructions ? <p className="mt-1 text-sm text-slate">{med.instructions}</p> : null}
            {med.prescribedBy ? <p className="mt-1 text-xs text-slate">Prescribed by {med.prescribedBy}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
