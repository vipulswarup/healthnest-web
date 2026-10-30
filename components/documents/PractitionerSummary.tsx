'use client';

import { useEffect, useRef, useState } from 'react';

export default function PractitionerSummary({ recordId, revision }: { recordId: string; revision: string }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;
    async function load() {
      setLoading(true);
      setError('');
      if (!force) setSummary('');
      try {
        const response = await fetch(`/api/health-records/${recordId}/summary`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The AI summary could not be generated.');
        if (!controller.signal.aborted) setSummary(data.summary);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Could not load summary.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [recordId, revision, attempt]);

  return (
    <section aria-label="AI summary for practitioners" className="rounded-xl border border-blue-200 bg-brand-tint p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">AI summary for practitioners</h3>
        {!loading && !error && summary ? (
          <button
            type="button"
            onClick={() => {
              forceRef.current = true;
              setAttempt((value) => value + 1);
            }}
            className="min-h-11 text-sm font-medium text-brand-strong underline"
          >
            Regenerate summary
          </button>
        ) : null}
      </div>
      <div aria-live="polite" className="mt-3 text-sm leading-7 text-ink">
        {loading ? (
          <p role="status">
            Preparing summary… This can take a short while after a new upload. The page will update automatically when ready.
          </p>
        ) : error ? (
          <div>
            <p role="alert">{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 min-h-11 font-medium text-brand-strong underline">Retry summary</button>
          </div>
        ) : <p className="whitespace-pre-line">{summary}</p>}
      </div>
      <p className="mt-3 text-xs text-slate">AI generated · Maximum 200 words · Verify against the original report.</p>
    </section>
  );
}
