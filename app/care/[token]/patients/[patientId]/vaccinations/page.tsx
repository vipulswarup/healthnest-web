'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { careApiBase } from '@/lib/care/paths';
import type { Vaccination } from '@/lib/vaccinations/format';

export default function CareVaccinationsPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [upcoming, setUpcoming] = useState<Array<{ id: string; vaccineName: string; doseLabel: string; nextDueDate: string }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/vaccinations`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load vaccinations');
        if (!cancelled) {
          setVaccinations(data.vaccinations || []);
          setUpcoming(data.upcoming || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load vaccinations');
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
        <h2 className="text-lg font-semibold text-ink">Vaccinations</h2>
        <p className="mt-1 text-sm text-slate">View only</p>
      </div>

      {upcoming.length > 0 ? (
        <div className="rounded-xl border border-blue-200 bg-brand-tint p-4">
          <h3 className="text-sm font-semibold text-ink">Upcoming</h3>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {upcoming.map((item) => (
              <li key={item.id}>
                {item.vaccineName}{item.doseLabel ? ` (${item.doseLabel})` : ''} · due {item.nextDueDate}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? <p className="text-slate" role="status">Loading vaccinations…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}
      {!loading && !error && vaccinations.length === 0 ? (
        <p className="text-sm text-slate">No vaccinations recorded.</p>
      ) : null}

      <ul className="space-y-3">
        {vaccinations.map((item) => (
          <li key={item.id} className="rounded-xl border border-silver bg-white p-4 shadow-sm">
            <p className="font-medium text-ink">
              {item.vaccineName}{item.doseLabel ? ` · ${item.doseLabel}` : ''}
            </p>
            <p className="mt-1 text-sm text-slate">
              {[item.administeredDate, item.provider, item.site].filter(Boolean).join(' · ')}
            </p>
            {item.nextDueDate ? (
              <p className="mt-1 text-sm text-slate">Next due: {item.nextDueDate}</p>
            ) : null}
            {item.notes ? <p className="mt-2 text-sm text-slate">{item.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
