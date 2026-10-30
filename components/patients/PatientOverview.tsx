'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PatientOverview as Overview, TimelineEntry } from '@/lib/patients/overview';

function date(value: string) {
  return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Undated';
}

export type OverviewLinkFor = {
  tag: (tag: string, patientId: string) => string;
  timeline: (entry: TimelineEntry, patientId: string) => string;
  pathology: (recordId: string, patientId: string) => string;
};

function defaultLinkFor(): OverviewLinkFor {
  return {
    tag: (tag, patientId) => `/health-records?${new URLSearchParams({ patientId, tag })}`,
    timeline: (entry, patientId) => (
      entry.kind === 'report'
        ? `/health-records/${entry.recordId}`
        : entry.kind === 'medication'
          ? `/medications?patientId=${patientId}`
          : `/visit-notes?patientId=${patientId}`
    ),
    pathology: (recordId) => `/health-records/${recordId}`,
  };
}

/** Care vault: keep deep links inside `/care/[token]/patients/[id]/...`. */
export function careOverviewLinkFor(basePath: string): OverviewLinkFor {
  const base = basePath.replace(/\/$/, '');
  return {
    tag: (tag) => `${base}/reports?${new URLSearchParams({ tag })}`,
    timeline: (entry) => (
      entry.kind === 'report'
        ? `${base}/reports/${entry.recordId}`
        : entry.kind === 'medication'
          ? `${base}/medications`
          : `${base}/notes`
    ),
    pathology: (recordId) => `${base}/reports/${recordId}`,
  };
}

export function PatientOverviewContent({ overview, summaryLoading = false, summaryError = '', onRetry, linkFor, emptySummaryHint }: {
  overview: Overview;
  summaryLoading?: boolean;
  summaryError?: string;
  onRetry?: () => void;
  linkFor?: OverviewLinkFor;
  emptySummaryHint?: string;
}) {
  const id = overview.patient.id;
  const links = linkFor || defaultLinkFor();
  return (
    <div className="space-y-7">
      <section aria-labelledby="case-summary-heading">
        <h2 id="case-summary-heading" className="mb-3 text-lg font-semibold text-ink">Case summary</h2>
        <div className="rounded-2xl border border-blue-200 bg-brand-tint p-5 sm:p-6">
          {overview.caseSummary ? <>
            {overview.caseSummary.stale && <p className="mb-2 text-sm font-semibold text-danger-strong">Records have changed · Previous summary</p>}
            <p className="whitespace-pre-line text-sm leading-7 text-ink">{overview.caseSummary.text}</p>
            <p className="mt-3 text-xs text-slate">AI generated · Saved {date(overview.caseSummary.generatedAt)} · Verify against source records.</p>
          </> : !overview.hasEvidence ? (
            <p className="text-sm text-slate">{emptySummaryHint || 'Add reports, medicines or notes to build a case summary.'}</p>
          ) : emptySummaryHint && !summaryLoading ? (
            <p className="text-sm text-slate">{emptySummaryHint}</p>
          ) : null}
          {summaryLoading && <p className="mt-2 text-sm text-slate" role="status">{overview.caseSummary ? 'Updating saved summary…' : 'Preparing case summary…'}</p>}
          {summaryError && onRetry ? (
            <div className="mt-2 text-sm"><p role="alert">{summaryError}</p><button type="button" onClick={onRetry} className="min-h-11 font-medium text-brand-strong underline">Retry summary</button></div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="text-lg font-semibold text-ink">Explore health topics</h2>
        <p className="mt-1 text-xs text-slate">Larger tags have more linked reports. Scroll for more topics.</p>
        <div tabIndex={0} role="region" aria-label="Health topics, scroll for more tags" className="mt-3 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-silver bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            {overview.tags.map(({ tag, count, weight }) => (
              <Link key={tag} href={links.tag(tag, id)} prefetch={false}
                aria-label={`${tag.replaceAll('_', ' ')}: ${count} ${count === 1 ? 'report' : 'reports'}`}
                style={{ fontSize: `${14 + Math.round(10 * weight)}px` }}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 font-medium text-brand-strong hover:bg-brand-tint">
                <span className="break-words">{tag.replaceAll('_', ' ')}</span><span className="text-xs text-slate">{count}</span>
              </Link>
            ))}
            {overview.tags.length === 0 && <p className="text-sm text-slate">Topics will appear as reports are tagged.</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="treatment-heading">
        <h2 id="treatment-heading" className="mb-3 text-lg font-semibold text-ink">Treatment timeline</h2>
        <div className="overflow-hidden rounded-2xl border border-silver bg-white">
          <div className="flex gap-4 bg-cream px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate"><span className="w-24 shrink-0">Date</span><span>Documented events</span></div>
          <div tabIndex={0} role="region" aria-label="Treatment timeline, scroll for more events" className="max-h-72 overflow-y-auto overscroll-contain">
            {overview.timeline.map((entry) => (
              <Link key={entry.id} href={links.timeline(entry, id)} prefetch={false} className="flex h-24 items-center gap-4 border-b border-silver/50 px-4 last:border-0 hover:bg-brand-tint">
                <div className="w-24 shrink-0 text-sm text-slate"><time>{date(entry.date)}</time>{entry.dateIsUpload && <span className="block text-xs">Uploaded</span>}</div>
                <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-ink">{entry.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate">{entry.detail}</p></div>
                <span aria-hidden className="text-brand-strong">↗</span>
              </Link>
            ))}
            {overview.timeline.length === 0 && <p className="p-5 text-sm text-slate">No dated events yet.</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate">Reports, recorded medicine courses and observations. Open an event for its source.</p>
      </section>

      <section aria-labelledby="pathology-heading">
        <h2 id="pathology-heading" className="mb-3 text-lg font-semibold text-ink">Pathology trend</h2>
        <div className="overflow-hidden rounded-2xl border border-silver bg-white">
          <div className="flex justify-between bg-cream px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate"><span>Parameter</span><span>Latest / previous</span></div>
          <div tabIndex={0} role="region" aria-label="Pathology trend, scroll for more parameters" className="max-h-72 overflow-y-auto overscroll-contain">
            {overview.pathology.map((entry) => (
              <Link key={entry.metric} href={links.pathology(entry.recordId, id)} prefetch={false} className="flex h-24 items-center justify-between gap-3 border-b border-silver/50 px-4 last:border-0 hover:bg-brand-tint">
                <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-semibold text-ink">{entry.label}</p><p className="mt-1 text-xs text-slate">{date(entry.date)} · {entry.trend}</p><p className="line-clamp-1 text-xs text-slate">{entry.reference ? `Reference: ${entry.reference}` : 'No reference range documented'}</p></div>
                <div className="max-w-[45%] text-right"><p className={`text-sm font-semibold ${['high', 'low', 'abnormal'].includes(entry.status) ? 'text-danger-strong' : 'text-ink'}`}>{entry.latest}</p><p className="text-xs text-slate">{entry.status === 'unknown' ? 'No range' : entry.status}</p>{entry.previous && <p className="text-xs text-slate">{entry.previous} · {date(entry.previousDate || '')}</p>}</div>
              </Link>
            ))}
            {overview.pathology.length === 0 && <p className="p-5 text-sm text-slate">No readable pathology results yet.</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate">Latest and previous documented results. Direction alone does not indicate improvement or deterioration.</p>
      </section>
    </div>
  );
}

export default function PatientOverview({ patientId }: { patientId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function summary(remaining = 45) {
      if (controller.signal.aborted) return;
      setSummaryLoading(true);
      try {
        const response = await fetch(`/api/patients/${patientId}/overview`, { method: 'POST', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not prepare case summary.');
        if (controller.signal.aborted) return;
        if (response.status === 202) {
          if (remaining <= 0) throw new Error('The summary is still being prepared. Please try again shortly.');
          timer = setTimeout(() => void summary(remaining - 1), 2000);
          return;
        }
        setOverview((previous) => previous ? { ...previous, caseSummary: data.caseSummary } : previous);
        setSummaryLoading(false);
      } catch (caught) {
        if (!controller.signal.aborted) { setSummaryError(caught instanceof Error ? caught.message : 'Could not prepare case summary.'); setSummaryLoading(false); }
      }
    }
    async function load() {
      setError(''); setSummaryError('');
      try {
        const response = await fetch(`/api/patients/${patientId}/overview`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load patient summary.');
        if (controller.signal.aborted) return;
        setOverview(data);
        if (data.hasEvidence && (!data.caseSummary || data.caseSummary.stale)) void summary();
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Could not load patient summary.');
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [patientId, attempt]);
  if (error) return <div role="alert"><p>{error}</p><button className="sv-btn sv-btn-secondary mt-3" onClick={() => setAttempt(attempt + 1)}>Retry</button></div>;
  if (!overview) return <p role="status" className="text-slate">Loading patient summary…</p>;
  return <><h1 className="mb-7 text-2xl font-bold text-ink">{overview.patient.name}</h1><PatientOverviewContent overview={overview} summaryLoading={summaryLoading} summaryError={summaryError} onRetry={() => setAttempt(attempt + 1)} /></>;
}
