'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { careApiBase, carePatientBase } from '@/lib/care/paths';

type CareRecordDetail = {
  id: string;
  title: string;
  recordType: string;
  source: string;
  doctorName: string | null;
  documentDate: string | null;
  createdAt: string;
  documentId: string | null;
  tags: string[];
  summary: string | null;
  facility: string | null;
  customType: string | null;
};

export default function CareRecordDetailPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const recordId = typeof params.recordId === 'string' ? params.recordId : '';
  const [record, setRecord] = useState<CareRecordDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !patientId || !recordId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`${careApiBase(token, patientId)}/records/${recordId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Record not found');
        if (!cancelled) setRecord(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Record not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [patientId, recordId, token]);

  const base = carePatientBase(token, patientId);

  if (loading) return <p className="text-slate" role="status">Loading report…</p>;
  if (error || !record) {
    return (
      <div>
        <p role="alert" className="text-danger-strong">{error || 'Record not found'}</p>
        <Link href={`${base}/reports`} className="mt-4 inline-block text-coral hover:underline">← Back to reports</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href={`${base}/reports`} className="inline-flex min-h-11 items-center text-sm font-medium text-coral hover:underline">
        ← Back to reports
      </Link>

      <article className="rounded-2xl border border-silver bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">{record.title}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate">Date</dt>
            <dd className="font-medium text-ink">{record.documentDate || 'Undated'}</dd>
          </div>
          <div>
            <dt className="text-slate">Type</dt>
            <dd className="font-medium text-ink">
              {(record.customType || record.recordType).replaceAll('_', ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-slate">Source</dt>
            <dd className="font-medium text-ink">{record.source || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate">Doctor</dt>
            <dd className="font-medium text-ink">{record.doctorName || '—'}</dd>
          </div>
          {record.facility ? (
            <div className="sm:col-span-2">
              <dt className="text-slate">Facility</dt>
              <dd className="font-medium text-ink">{record.facility}</dd>
            </div>
          ) : null}
        </dl>

        {record.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {record.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-blue-200 bg-brand-tint px-3 py-1 text-xs text-ink">
                {tag.replaceAll('_', ' ')}
              </li>
            ))}
          </ul>
        ) : null}

        {record.documentId ? (
          <a
            href={`/api/care/${token}/documents/${record.documentId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong"
          >
            Open original
          </a>
        ) : null}

        {record.summary ? (
          <div className="mt-6 rounded-xl border border-blue-200 bg-brand-tint p-4">
            <h3 className="text-sm font-semibold text-ink">Practitioner summary</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{record.summary}</p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
