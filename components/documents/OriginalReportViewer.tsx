'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const PdfPages = dynamic(() => import('./PdfPages'), { ssr: false, loading: () => <p className="p-5" role="status">Loading viewer…</p> });

type DocumentView = { url: string; downloadUrl?: string; fileType?: string; fileName?: string };

export default function OriginalReportViewer({ documentId, title }: { documentId: string; title: string }) {
  const [view, setView] = useState<DocumentView | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setView(null); setError('');
      try {
        const response = await fetch('/api/documents/view', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load the original file.');
        if (!controller.signal.aborted) setView(data);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Could not load the original file.');
      }
    }
    void load();
    return () => controller.abort();
  }, [documentId, attempt]);

  const isPdf = view?.fileType?.toLowerCase().includes('pdf') || /\.pdf$/i.test(view?.fileName || '');
  const isImage = view?.fileType?.startsWith('image/') || view?.url.startsWith('/api/documents/preview');
  return (
    <section aria-label="Original report">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">Original report</h3>
        {view && <a href={view.downloadUrl || view.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-strong underline">Open original file ↗</a>}
      </div>
      <div className="overflow-hidden rounded-xl border border-silver bg-white">
        {error ? <div className="p-5"><p role="alert">{error}</p><button type="button" onClick={() => setAttempt(attempt + 1)} className="min-h-11 text-brand-strong underline">Retry file</button></div>
          : !view ? <p role="status" className="p-5 text-slate">Loading original file…</p>
          : isPdf ? <PdfPages key={`${documentId}:${attempt}`} url={`/api/documents/${documentId}/file`} />
          : isImage ? <Image src={view.url} alt={`${title} original report`} width={1200} height={1600} unoptimized className="mx-auto h-auto max-w-full" onError={() => setError('Could not display the image. Please retry.')} />
          : <p className="p-5 text-slate">Preview is unavailable for this file type. Use the original file link above.</p>}
      </div>
    </section>
  );
}
