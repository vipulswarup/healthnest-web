'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { careApiBase, carePatientBase } from '@/lib/care/paths';

type CareRecord = {
  id: string;
  title: string;
  recordType: string;
  source: string;
  doctorName: string | null;
  documentDate: string | null;
  tags: string[];
  summary: string | null;
};

function CareReportsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const tagFilter = searchParams.get('tag') || '';

  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId) return;
    let cancelled = false;
    const query = new URLSearchParams();
    if (tagFilter) query.set('tag', tagFilter);
    if (keyword.trim()) query.set('keyword', keyword.trim());
    const qs = query.toString();

    async function load() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${careApiBase(token, patientId)}/records${qs ? `?${qs}` : ''}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reports');
        if (!cancelled) setRecords(data.records || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [keyword, patientId, tagFilter, token]);

  const base = carePatientBase(token, patientId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Reports</h2>
          <p className="mt-1 text-sm text-slate">All document types · view only</p>
        </div>
        <label className="block text-sm text-slate">
          Search
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="mt-1 block w-56 rounded-lg border border-silver bg-white px-3 py-2 text-sm text-ink"
            placeholder="Title, source, tag…"
          />
        </label>
      </div>

      {tagFilter ? (
        <p className="text-sm text-slate">
          Filtered by topic <span className="font-medium text-ink">{tagFilter.replaceAll('_', ' ')}</span>
          {' · '}
          <Link href={`${base}/reports`} className="text-coral hover:underline">Clear</Link>
        </p>
      ) : null}

      {loading ? <p className="text-slate" role="status">Loading reports…</p> : null}
      {error ? <p role="alert" className="text-danger-strong">{error}</p> : null}

      {!loading && !error && records.length === 0 ? (
        <p className="text-sm text-slate">No reports for this person.</p>
      ) : null}

      <ul className="space-y-3">
        {records.map((record) => (
          <li key={record.id}>
            <Link
              href={`${base}/reports/${record.id}`}
              prefetch={false}
              className="block rounded-xl border border-silver bg-white p-4 shadow-sm hover:bg-brand-tint"
            >
              <p className="font-medium text-ink">{record.title}</p>
              <p className="mt-1 text-sm text-slate">
                {[record.documentDate, record.recordType.replaceAll('_', ' '), record.source, record.doctorName]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {record.summary ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate">{record.summary}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CareReportsPage() {
  return (
    <Suspense fallback={<p className="text-slate">Loading reports…</p>}>
      <CareReportsContent />
    </Suspense>
  );
}
