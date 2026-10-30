'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const primary = [
  { segment: '', label: 'Overview' },
  { segment: 'reports', label: 'Reports' },
  { segment: 'medications', label: 'Medicines' },
  { segment: 'notes', label: 'Symptoms' },
  { segment: 'bp', label: 'BP' },
] as const;

const more = [
  { segment: 'growth', label: 'Growth' },
  { segment: 'vaccinations', label: 'Vaccinations' },
] as const;

export function CareNav({
  token,
  patientId,
  patientName,
}: {
  token: string;
  patientId: string;
  patientName?: string;
}) {
  const pathname = usePathname();
  const base = `/care/${token}/patients/${patientId}`;
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (segment: string) => {
    if (!segment) return pathname === base || pathname === `${base}/`;
    return pathname === `${base}/${segment}` || pathname.startsWith(`${base}/${segment}/`);
  };

  const moreActive = more.some((item) => isActive(item.segment));

  return (
    <header className="border-b border-silver bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <p className="text-sm font-medium text-coral">SanoVault · Doctor view · View only</p>
        {patientName ? (
          <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{patientName}</h1>
        ) : null}
        <nav className="mt-4 flex flex-wrap items-center gap-1" aria-label="Patient vault">
          {primary.map((item) => {
            const href = item.segment ? `${base}/${item.segment}` : base;
            const active = isActive(item.segment);
            return (
              <Link
                key={item.label}
                href={href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium ${
                  active ? 'bg-sage/25 text-ink' : 'text-slate hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="relative">
            <button
              type="button"
              className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium ${
                moreActive || moreOpen ? 'bg-sage/25 text-ink' : 'text-slate hover:text-ink'
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((open) => !open)}
            >
              More
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute left-0 z-30 mt-1 min-w-[10rem] rounded-xl border border-silver bg-white py-1 shadow-lg"
              >
                {more.map((item) => {
                  const href = `${base}/${item.segment}`;
                  const active = isActive(item.segment);
                  return (
                    <Link
                      key={item.segment}
                      role="menuitem"
                      href={href}
                      prefetch={false}
                      onClick={() => setMoreOpen(false)}
                      className={`block whitespace-nowrap px-4 py-2.5 text-sm ${
                        active ? 'bg-sage/20 font-medium text-ink' : 'text-slate hover:bg-cream hover:text-ink'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
