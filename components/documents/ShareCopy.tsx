'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildShareCopy, type CoverSpec } from '@/lib/pdf/share';

type LoadedDocument = {
  id: string;
  label: string;
};

export function ShareCopy({
  documents,
  cover,
  defaultWatermark,
  defaultFileName,
}: {
  documents: LoadedDocument[];
  cover?: CoverSpec;
  defaultWatermark?: string;
  defaultFileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [watermark, setWatermark] = useState(defaultWatermark || '');
  const [password, setPassword] = useState('');

  const documentKey = documents.map((document) => document.id).join('|');
  const coverKey = JSON.stringify(cover ?? null);

  const loadDocuments = useCallback(async () => {
    if (documents.length === 0) return [];
    return Promise.all(documents.map(async (document) => {
      const response = await fetch(`/api/documents/${document.id}/file`);
      if (!response.ok) throw new Error('Could not open a report for sharing');
      const buffer = new Uint8Array(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'application/pdf';
      return { bytes: buffer, fileName: document.label, mimeType };
    }));
  }, [documents]);

  useEffect(() => {
    if (!open) return;
    setBusy('');
    setError('');
  }, [open, documentKey, coverKey]);

  const exportCopy = async () => {
    try {
      setBusy('Preparing PDF…');
      setError('');
      const loaded = await loadDocuments();
      const file = await buildShareCopy({
        documents: loaded,
        cover,
        watermark: watermark.trim() || undefined,
        password: password.trim() || undefined,
        fileName: defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`,
      });
      const shareData = { files: [file], title: file.name };
      try {
        if (typeof navigator.share === 'function' && navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch {
        // Fall through to a same-device download.
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the share copy');
    } finally {
      setBusy('');
    }
  };

  if (documents.length === 0 && !cover) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 print:hidden"
      >
        Download PDF packet
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="share-copy-title">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-5 shadow-sm">
            <h2 id="share-copy-title" className="text-xl font-semibold text-gray-950">Download PDF packet</h2>
            <p className="mt-1 text-sm text-gray-600">
              Build a PDF you can save or share from your phone.
            </p>

            {busy ? <p className="mt-4 text-sm text-gray-600" role="status">{busy}</p> : null}
            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Watermark (optional)
                <input value={watermark} onChange={(event) => setWatermark(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Password (optional)
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="off" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void exportCopy()} disabled={Boolean(busy)} className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50">
                Download / share
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:underline">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
