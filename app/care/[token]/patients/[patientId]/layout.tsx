'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CareNav } from '@/components/care/CareNav';
import { careApiBase } from '@/lib/care/paths';

export default function CarePatientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    void fetch(`${careApiBase(token, patientId)}/overview`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || cancelled) return;
        if (data?.patient?.name) setPatientName(String(data.patient.name));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [patientId, token]);

  return (
    <div className="min-h-screen bg-slate-50">
      <CareNav token={token} patientId={patientId} patientName={patientName || undefined} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
