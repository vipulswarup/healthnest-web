'use client';

import { useEffect, useMemo, useState } from 'react';
import { dobPasswordCandidates } from '@/lib/pdf/passwords';
import {
  PdfPasswordError,
  buildPageList,
  buildPreparedFiles,
  inspectSources,
  unlockSource,
  type PreparedPage,
  type PreparedSource,
} from '@/lib/pdf/prepare';

export function DocumentPrepare({
  files,
  dateOfBirth,
  onCancel,
  onReady,
}: {
  files: File[];
  dateOfBirth?: string | Date | null;
  onCancel: () => void;
  onReady: (files: File[]) => void;
}) {
  const [sources, setSources] = useState<PreparedSource[] | null>(null);
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [combine, setCombine] = useState(files.length > 1);
  const [compress, setCompress] = useState(files.some((file) => file.size > 8 * 1024 * 1024));
  const [keepDroppedAsNext, setKeepDroppedAsNext] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('Reading files…');
  const [error, setError] = useState('');

  const dobPasswords = useMemo(() => dobPasswordCandidates(dateOfBirth), [dateOfBirth]);
  const locked = sources?.find((source) => source.encrypted);

  useEffect(() => {
    let active = true;
    setBusy('Reading files…');
    setError('');
    void inspectSources(files, dobPasswords)
      .then(async (inspected) => {
        if (!active) return;
        setSources(inspected);
        if (inspected.some((source) => source.encrypted)) {
          setBusy('');
          return;
        }
        const nextPages = await buildPageList(inspected);
        if (!active) return;
        setPages(nextPages);
        setBusy('');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not read these files');
        setBusy('');
      });
    return () => {
      active = false;
    };
  }, [dobPasswords, files]);

  useEffect(() => {
    return () => {
      for (const page of pages) {
        if (page.thumbnailUrl.startsWith('blob:')) URL.revokeObjectURL(page.thumbnailUrl);
      }
    };
  }, [pages]);

  const unlockLocked = async () => {
    if (!sources || !locked) return;
    setBusy('Unlocking PDF…');
    setError('');
    try {
      const nextSources = await Promise.all(
        sources.map((source) => (source.encrypted ? unlockSource(source, password.trim()) : source)),
      );
      const nextPages = await buildPageList(nextSources);
      setSources(nextSources);
      setPages(nextPages);
      setPassword('');
    } catch (err) {
      setError(err instanceof PdfPasswordError ? 'That password did not open the PDF. Labs often use date of birth as DDMMYYYY.' : err instanceof Error ? err.message : 'Could not unlock this PDF');
    } finally {
      setBusy('');
    }
  };

  const continuePrepare = async () => {
    if (!sources) return;
    setBusy('Preparing PDF…');
    setError('');
    try {
      const prepared = await buildPreparedFiles({
        sources,
        pages,
        combine,
        compress,
        keepDroppedAsNext,
      });
      onReady(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare this document');
      setBusy('');
    }
  };

  const rotate = (id: string) => {
    setPages((current) => current.map((page) => (
      page.id === id
        ? { ...page, rotation: ((page.rotation + 90) % 360) as PreparedPage['rotation'] }
        : page
    )));
  };

  const togglePage = (id: string) => {
    setPages((current) => current.map((page) => (page.id === id ? { ...page, included: !page.included } : page)));
  };

  if (locked) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">This PDF is password protected</h3>
        <p className="text-sm text-gray-600">
          Indian lab reports often use the patient’s date of birth. Try DDMMYYYY, or type the password from the lab SMS.
        </p>
        <p className="text-sm text-gray-800">{locked.file.name}</p>
        <label className="block text-sm font-medium text-gray-700" htmlFor="pdf-password">PDF password</label>
        <input
          id="pdf-password"
          type="text"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void unlockLocked()} disabled={!password.trim() || Boolean(busy)} className="min-h-12 rounded-xl bg-coral px-4 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50">
            {busy || 'Unlock'}
          </button>
          <button type="button" onClick={onCancel} className="min-h-12 rounded-xl px-4 text-base font-medium text-gray-700 hover:underline">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Prepare the document</h3>
        <p className="mt-1 text-sm text-gray-600">Rotate pages, drop extras, then continue. Photos are combined into one PDF before upload.</p>
      </div>

      {busy ? <p className="text-sm text-gray-600" role="status">{busy}</p> : null}

      {pages.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pages.map((page, index) => (
            <li key={page.id} className={`overflow-hidden rounded-xl border ${page.included ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50 opacity-60'}`}>
              {page.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${index + 1}`}
                  className="h-36 w-full object-contain bg-gray-100"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />
              ) : (
                <div className="flex h-36 items-center justify-center text-xs text-gray-500">Page {index + 1}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" checked={page.included} onChange={() => togglePage(page.id)} />
                  Keep
                </label>
                <button type="button" onClick={() => rotate(page.id)} className="text-xs font-medium text-coral hover:underline">
                  Rotate
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2 text-sm text-gray-800">
        {files.length > 1 ? (
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={combine} onChange={(event) => setCombine(event.target.checked)} />
            <span>Combine into one document</span>
          </label>
        ) : null}
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={compress} onChange={(event) => setCompress(event.target.checked)} />
          <span>Compress before upload</span>
        </label>
        {pages.some((page) => !page.included) ? (
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={keepDroppedAsNext} onChange={(event) => setKeepDroppedAsNext(event.target.checked)} />
            <span>Save removed pages as the next record</span>
          </label>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void continuePrepare()}
          disabled={Boolean(busy) || pages.every((page) => !page.included)}
          className="min-h-12 rounded-xl bg-coral px-4 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
        >
          Continue
        </button>
        <button type="button" onClick={onCancel} className="min-h-12 rounded-xl px-4 text-base font-medium text-gray-700 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
