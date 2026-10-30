'use client';

import { useEffect, useRef, useState } from 'react';
import { getDocument } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { ensurePdfjsWorker } from '@/lib/pdf/inspect';

function PdfPage({ pdf, number }: { pdf: PDFDocumentProxy; number: number }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(0.707);
  const [error, setError] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '300px' });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    const target = canvas.current;
    async function render() {
      try {
        const page = await pdf.getPage(number);
        if (cancelled || !target) return;
        const natural = page.getViewport({ scale: 1 });
        setRatio(natural.width / natural.height);
        const width = Math.min(container.current?.clientWidth || 900, 1200);
        const scale = width * Math.min(window.devicePixelRatio || 1, 2) / natural.width;
        const viewport = page.getViewport({ scale });
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        const context = target.getContext('2d');
        if (!context) throw new Error('Could not display this page.');
        task = page.render({ canvasContext: context, viewport });
        await task.promise;
      } catch {
        if (!cancelled) setError('Could not display this page. Try opening the original file.');
      }
    }
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
      // Release off-screen page pixels; the placeholder preserves scroll position.
      if (target) { target.width = 0; target.height = 0; }
    };
  }, [pdf, number, visible]);

  return (
    <figure className="mb-5">
      <figcaption className="mb-2 text-center text-xs text-slate">Page {number} of {pdf.numPages}</figcaption>
      <div ref={container} className="relative w-full bg-white shadow-sm" style={{ aspectRatio: ratio }}>
        <canvas ref={canvas} role="img" aria-label={`Report page ${number} of ${pdf.numPages}`} className="h-full w-full" />
        {error && <p role="alert" className="absolute inset-0 p-5 text-sm text-danger-strong">{error}</p>}
      </div>
    </figure>
  );
}

export default function PdfPages({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [attempt, setAttempt] = useState(0);
  const submitPassword = useRef<((password: string) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let task: PDFDocumentLoadingTask | undefined;
    async function load() {
      setPdf(null);
      setError('');
      setPasswordRequired(false);
      try {
        // Fetch with the app's authenticated session before handing bytes to the worker.
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load the file.');
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;
        ensurePdfjsWorker();
        task = getDocument({ data, isEvalSupported: false });
        task.onPassword = (updatePassword: (password: string) => void) => {
          if (cancelled) return;
          submitPassword.current = updatePassword;
          setPasswordRequired(true);
        };
        const document = await task.promise;
        if (!cancelled) { setPdf(document); setPasswordRequired(false); }
      } catch {
        if (!cancelled) setError('Could not display this PDF. Try opening the original file.');
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
      submitPassword.current = null;
      void task?.destroy();
    };
  }, [url, attempt]);

  if (error) return (
    <div className="p-5">
      <p role="alert" className="text-danger-strong">{error}</p>
      <button type="button" onClick={() => setAttempt(attempt + 1)} className="min-h-11 text-brand-strong underline">Retry file</button>
    </div>
  );
  if (passwordRequired) return (
    <form className="space-y-3 p-5" onSubmit={(event) => {
      event.preventDefault(); setPasswordRequired(false); submitPassword.current?.(password);
    }}>
      <label className="block text-sm font-medium">PDF password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-silver bg-white px-3" autoComplete="off" required />
      </label>
      <button type="submit" className="sv-btn sv-btn-primary">Unlock file</button>
    </form>
  );
  if (!pdf) return <p role="status" className="p-5 text-slate">Loading all pages…</p>;
  return (
    <div>
      <p className="border-b border-silver px-4 py-3 text-sm text-slate">{pdf.numPages} {pdf.numPages === 1 ? 'page' : 'pages'} · Scroll to view all pages</p>
      <div tabIndex={0} aria-label="Report pages" className="max-h-[75vh] overflow-auto bg-cream p-3 sm:p-5">
        {Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1} pdf={pdf} number={index + 1} />)}
      </div>
    </div>
  );
}
