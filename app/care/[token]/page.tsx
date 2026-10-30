'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { carePatientBase } from '@/lib/care/paths';

type CarePatient = {
  id: string;
  name: string;
  dateOfBirth: string | null;
};

type CareView = {
  share: { label: string | null; viewCount: number };
  patients: CarePatient[];
};

export default function CareShareLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : '';
  const [view, setView] = useState<CareView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/care/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Share link not found');
        if (cancelled) return;
        if (Array.isArray(data.patients) && data.patients.length === 1) {
          router.replace(carePatientBase(token, data.patients[0].id));
          return;
        }
        setView(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Share link not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router, token]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-gray-600">Loading shared vault…</div>;
  }

  if (error || !view) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Link unavailable</h1>
          <p className="mt-2 text-gray-600">{error || 'This share link has been stopped.'}</p>
          <Link href="/" className="mt-6 inline-block text-coral hover:underline">Go to SanoVault</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          <p className="text-sm font-medium text-coral">SanoVault · Doctor view · View only</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">
            {view.share.label || 'Shared health vault'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">Choose a person to browse their records.</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {view.patients.length === 0 ? (
          <p className="text-sm text-gray-600">No patients on this share.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {view.patients.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={carePatientBase(token, patient.id)}
                  prefetch={false}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-coral/40 hover:bg-brand-tint"
                >
                  <p className="text-lg font-semibold text-gray-900">{patient.name}</p>
                  {patient.dateOfBirth ? (
                    <p className="mt-1 text-sm text-gray-600">Date of birth: {patient.dateOfBirth}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-medium text-coral">Open vault →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
