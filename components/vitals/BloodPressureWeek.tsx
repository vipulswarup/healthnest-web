'use client';

import { useMemo } from 'react';
import type { BpDaySlot } from '@/lib/vitals/blood-pressure';

export function BloodPressureWeek({ days }: { days: BpDaySlot[] }) {
  const maxSys = useMemo(() => {
    let max = 140;
    for (const day of days) {
      for (const slot of [day.morning, day.afternoon, day.evening]) {
        if (slot && slot.systolic > max) max = slot.systolic;
      }
    }
    return Math.max(160, max);
  }, [days]);

  return (
    <section aria-label="Last 7 days">
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
                      className={`w-2.5 rounded-sm ${reading ? 'bg-coral' : 'bg-gray-200'}`}
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
      <ul className="mt-4 space-y-2">
        {[...days].reverse().map((day) => {
          const slots = [day.morning, day.afternoon, day.evening].filter(Boolean);
          return (
            <li key={day.date} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-gray-500">{day.label}</p>
              {slots.length === 0 ? (
                <p className="mt-1 text-base text-gray-600">No readings</p>
              ) : (
                <p className="mt-1 text-lg text-gray-950">
                  {slots.map((reading) => `${reading!.systolic}/${reading!.diastolic}`).join(' · ')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
