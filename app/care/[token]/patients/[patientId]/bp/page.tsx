'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { careApiBase } from '@/lib/care/paths';
import { periodLabel, type BloodPressureReading, type BpDaySlot } from '@/lib/vitals/blood-pressure';

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export default function CareBpPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [days, setDays] = useState<BpDaySlot[]>([]);
  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/bp?days=30`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load blood pressure');
        if (!cancelled) {
          setDays(data.days || []);
          setReadings(data.readings || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load blood pressure');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [patientId, token]);

  const sorted = useMemo(
    () => [...readings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [readings],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Blood pressure</h2>
        <p className="mt-1 text-sm text-slate">Last 30 days · view only</p>
      </div>

      {loading ? <p className="text-slate" role="status">Loading blood pressure…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}
      {!loading && !error && sorted.length === 0 ? (
        <p className="text-sm text-slate">No blood pressure readings recorded.</p>
      ) : null}

      {days.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-silver bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Morning</th>
                <th className="px-4 py-3">Afternoon</th>
                <th className="px-4 py-3">Evening</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date} className="border-t border-silver/60">
                  <td className="px-4 py-3 font-medium text-ink">{day.date}</td>
                  {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                    const slot = day[period];
                    return (
                      <td key={period} className="px-4 py-3 text-slate">
                        {slot ? `${slot.systolic}/${slot.diastolic}${slot.pulse ? ` · ${slot.pulse}` : ''}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <ul className="space-y-2">
          {sorted.map((reading) => (
            <li key={reading.id} className="rounded-lg border border-silver bg-white px-4 py-3 text-sm">
              <span className="font-medium text-ink">{reading.systolic}/{reading.diastolic}</span>
              {reading.pulse ? <span className="text-slate"> · pulse {reading.pulse}</span> : null}
              <span className="text-slate"> · {periodLabel(reading.period)} · {formatWhen(reading.recordedAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
