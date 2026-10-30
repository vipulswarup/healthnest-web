'use client';

import Link from 'next/link';
import { useState } from 'react';
import { svBtnOutline, svBtnPrimary } from '@/lib/ui/buttons';

type TrackLink = {
  href: string;
  label: string;
};

function trackLinks(patientId: string): TrackLink[] {
  return [
    { href: `/growth?patientId=${patientId}`, label: 'Height & Weight' },
    { href: `/vaccinations?patientId=${patientId}`, label: 'Vaccinations' },
    { href: `/medications?patientId=${patientId}`, label: 'Medicines' },
    { href: `/for-the-doctor?patientId=${patientId}`, label: 'Prepare doctor packet' },
  ];
}

export function PersonCardActions({
  patientId,
  onNavigate,
}: {
  patientId: string;
  onNavigate: () => void;
}) {
  const links = trackLinks(patientId);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/visit-notes?patientId=${patientId}`}
          prefetch={false}
          onClick={onNavigate}
          className={`${svBtnPrimary} w-full px-2 text-sm sm:text-base`}
        >
          Log Symptom
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
          <span>More</span>
          <span className="hidden text-sm font-normal text-blue-slate sm:inline group-open:hidden">Growth, Vaccines, Doctor packet</span>
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
