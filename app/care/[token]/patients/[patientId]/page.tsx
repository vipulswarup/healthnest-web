'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  careOverviewLinkFor,
  PatientOverviewContent,
} from '@/components/patients/PatientOverview';
import type { PatientOverview as Overview } from '@/lib/patients/overview';
import { careApiBase, carePatientBase } from '@/lib/care/paths';

export default function CarePatientOverviewPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const linkFor = useMemo(
    () => careOverviewLinkFor(carePatientBase(token, patientId)),
    [patientId, token],
  );

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${careApiBase(token, patientId)}/overview`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load overview');
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [patientId, token]);

  if (loading) return <p className="text-slate" role="status">Loading patient summary…</p>;
  if (error || !overview) return <p role="alert" className="text-danger-strong">{error || 'Overview unavailable'}</p>;

  return (
    <PatientOverviewContent
      overview={overview}
      linkFor={linkFor}
      emptySummaryHint="No saved case summary yet. Browse Reports, Medicines, and Symptoms for source details."
    />
  );
}
