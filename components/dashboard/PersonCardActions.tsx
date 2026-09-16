'use client';

import Link from 'next/link';
import { useState } from 'react';
import { svBtnOutline, svBtnPrimary, svBtnSecondary } from '@/lib/ui/buttons';

type TrackLink = {
  href: string;
  label: string;
};

function trackLinks(patientId: string): TrackLink[] {
  return [
    { href: `/growth?patientId=${patientId}`, label: 'Height & Weight' },
    { href: `/vaccinations?patientId=${patientId}`, label: 'Vaccinations' },
    { href: `/medications?patientId=${patientId}`, label: 'Medicines' },
    { href: `/visit-notes?patientId=${patientId}`, label: 'Visit Notes' },
  ];
}

export function PersonCardActions({
  patientId,
  onAddReport,
  onNavigate,
}: {
  patientId: string;
  onAddReport: () => void;
  onNavigate: () => void;
}) {
  const links = trackLinks(patientId);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={`${svBtnPrimary} w-full px-2 text-sm sm:text-base`} onClick={onAddReport}>
          Add a Report
        </button>
        <Link
          href={`/for-the-doctor?patientId=${patientId}`}
          prefetch={false}
          onClick={onNavigate}
          className={`${svBtnSecondary} w-full px-2 text-sm sm:text-base`}
        >
          For the Doctor
        </Link>
        <Link
          href={`/bp?patientId=${patientId}`}
          prefetch={false}
          onClick={onNavigate}
          className={`${svBtnOutline} w-full px-2 text-sm sm:text-base`}
        >
          Log BP
        </Link>
      </div>

      <details
        className="group rounded-xl border border-silver bg-white open:bg-white"
        onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
          <span>More Tracking</span>
          <span className="hidden text-sm font-normal text-blue-slate sm:inline group-open:hidden">Growth, Vaccines, Meds</span>
          <span aria-hidden className="text-blue-slate group-open:rotate-180">▾</span>
        </summary>
        <div className="grid grid-cols-2 gap-2 border-t border-silver px-3 pb-3 pt-2">
          {open && links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              onClick={onNavigate}
              className={`${svBtnOutline} w-full px-3 text-sm sm:text-base`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
