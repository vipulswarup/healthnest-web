'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { careApiBase } from '@/lib/care/paths';
import type { GrowthMeasurement } from '@/lib/vitals/growth';

export default function CareGrowthPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/growth`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load growth');
        if (!cancelled) setMeasurements(data.measurements || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load growth');
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
        <h2 className="text-lg font-semibold text-ink">Height & weight</h2>
        <p className="mt-1 text-sm text-slate">View only</p>
      </div>

      {loading ? <p className="text-slate" role="status">Loading growth…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}
      {!loading && !error && measurements.length === 0 ? (
        <p className="text-sm text-slate">No growth measurements recorded.</p>
      ) : null}

      <ul className="space-y-3">
        {measurements.map((item) => (
          <li key={item.id} className="rounded-xl border border-silver bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-ink">{item.measuredAt.slice(0, 10)}</p>
            <p className="mt-1 text-sm text-slate">
              {[
                item.heightCm != null ? `Height ${item.heightCm} cm` : null,
                item.weightKg != null ? `Weight ${item.weightKg} kg` : null,
                item.headCircumCm != null ? `Head ${item.headCircumCm} cm` : null,
              ].filter(Boolean).join(' · ')}
            </p>
            {item.notes ? <p className="mt-2 text-sm text-slate">{item.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
