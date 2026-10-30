'use client';

import { useMemo, useState } from 'react';
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

type Props = {
  days: BpDaySlot[];
  readings: BloodPressureReading[];
  onChanged: () => void;
};

export function BloodPressureWeek({ days, readings, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const maxSys = useMemo(() => {
    let max = 140;
    for (const day of days) {
      for (const slot of [day.morning, day.afternoon, day.evening]) {
        if (slot && slot.systolic > max) max = slot.systolic;
      }
    }
    return Math.max(160, max);
  }, [days]);

  // Newest first, whatever order the server sent.
  const sorted = useMemo(
    () => [...readings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [readings],
  );

  const startEdit = (reading: BloodPressureReading) => {
    setEditingId(reading.id);
    setSys(String(reading.systolic));
    setDia(String(reading.diastolic));
    setPulse(reading.pulse ? String(reading.pulse) : '');
    setError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/vitals/blood-pressure/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systolic: Number.parseInt(sys, 10),
          diastolic: Number.parseInt(dia, 10),
          pulse: pulse.trim() ? Number.parseInt(pulse, 10) : null,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this reading?')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/vitals/blood-pressure/${id}`, { method: 'DELETE' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not delete');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Blood pressure history">
      <h2 className="text-lg font-semibold text-gray-950">Last 7 days</h2>
      <div className="mt-3 overflow-x-auto">
        <div className="grid min-w-[20rem] grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day.date} className="text-center">
              <p className="text-xs font-medium text-gray-600">{day.label}</p>
              <div className="mt-2 flex h-28 items-end justify-center gap-0.5">
                {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                  const reading = day[period];
                  const height = reading ? Math.max(10, Math.round((reading.systolic / maxSys) * 112)) : 6;
                  return (
                    <div
                      key={period}
                      className={`w-2.5 rounded-sm ${reading ? 'bg-brand' : 'bg-gray-200'}`}
                      style={{ height: `${height}px` }}
                      title={reading ? `${reading.systolic}/${reading.diastolic}` : 'No reading'}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-950">Readings, newest first</h2>
      {error ? <p className="mt-2 text-base text-red-700" role="alert">{error}</p> : null}
      {sorted.length === 0 ? (
        <p className="mt-3 text-base text-gray-600">No readings in the last 7 days.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((reading) => (
            <li key={reading.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              {editingId === reading.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input aria-label="Systolic" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value.replace(/\D/g, '').slice(0, 3))} className="rounded-lg border border-gray-300 px-2 py-2 text-xl" />
                    <input aria-label="Diastolic" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 3))} className="rounded-lg border border-gray-300 px-2 py-2 text-xl" />
                    <input aria-label="Pulse" inputMode="numeric" placeholder="Pulse" value={pulse} onChange={(e) => setPulse(e.target.value.replace(/\D/g, '').slice(0, 3))} className="rounded-lg border border-gray-300 px-2 py-2 text-xl" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" disabled={busy} onClick={() => void saveEdit()} className="rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-60">Save changes</button>
                    <button type="button" disabled={busy} onClick={() => setEditingId(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500">
                    {formatWhen(reading.recordedAt)} · {periodLabel(reading.period)}
                  </p>
                  <p className="mt-1 text-xl text-gray-950">
                    {reading.systolic}/{reading.diastolic}
                    {reading.pulse ? <span className="ml-2 text-base text-gray-600">pulse {reading.pulse}</span> : null}
                  </p>
                  <div className="mt-2 flex gap-4">
                    <button type="button" onClick={() => startEdit(reading)} className="text-sm font-medium text-brand-strong hover:underline">Edit</button>
                    {reading.vaultOwned ? (
                      <button type="button" onClick={() => void remove(reading.id)} className="text-sm font-medium text-red-700 hover:underline">Delete</button>
                    ) : null}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
