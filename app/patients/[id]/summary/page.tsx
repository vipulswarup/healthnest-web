'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppNav from '@/components/layout/AppNav';
import PatientOverview from '@/components/patients/PatientOverview';

export default function PatientSummaryPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-cream">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
        <nav className="mb-5 flex flex-wrap justify-between gap-3 text-sm font-medium text-brand-strong">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center">← Home</Link>
          <Link href={`/patients/${id}`} className="inline-flex min-h-11 items-center underline">Patient details &amp; settings</Link>
        </nav>
        <PatientOverview key={id} patientId={id} />
      </main>
    </div>
  );
}
