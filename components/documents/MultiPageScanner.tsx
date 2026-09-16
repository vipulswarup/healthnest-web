'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ScanCropAdjust } from '@/components/documents/ScanCropAdjust';
import { detectDocumentQuad, drawQuadOverlay } from '@/lib/scan/detect';
import { type Quad } from '@/lib/scan/geometry';
import { prepareCrop, rescanWithFilter, scanPhoto, type CropDraft, type ScanFilter } from '@/lib/scan/process';

type ScanPage = {
  id: string;
  file: File;
  url: string;
  originalBlob: Blob;
  warpedBlob: Blob;
};

const FILTERS: Array<{ id: ScanFilter; label: string }> = [
  { id: 'enhance', label: 'Clearer text' },
  { id: 'photo', label: 'Photo' },
  { id: 'bw', label: 'Black and white' },
];

export function MultiPageScanner({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: (files: File[]) => void;
}) {
  const cameraInputId = useId();
  const libraryInputId = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const pagesRef = useRef<ScanPage[]>([]);
  const filterRef = useRef<ScanFilter>('enhance');

  const [pages, setPages] = useState<ScanPage[]>([]);
  const [filter, setFilter] = useState<ScanFilter>('enhance');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [cameraMode, setCameraMode] = useState<'pending' | 'live' | 'file'>('pending');
  const [draft, setDraft] = useState<CropDraft | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  pagesRef.current = pages;
  filterRef.current = filter;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setCameraMode('file');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          setCameraMode('file');
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setCameraMode('live');
      } catch {
        if (!cancelled) setCameraMode('file');
      }
    };

    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
    };
  }, []);

  useEffect(() => {
    if (cameraMode !== 'live' || draft) return;
    const tick = () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay || video.readyState < 2 || !video.videoWidth || overlay.clientWidth < 8) return;
      if (!scratchRef.current) scratchRef.current = document.createElement('canvas');
      const scratch = scratchRef.current;
      const detectWidth = 480;
      const detectHeight = Math.max(1, Math.round((480 * video.videoHeight) / video.videoWidth));
      scratch.width = detectWidth;
      scratch.height = detectHeight;
      const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
      if (!scratchContext) return;
      scratchContext.drawImage(video, 0, 0, detectWidth, detectHeight);
      const quad = detectDocumentQuad(scratchContext.getImageData(0, 0, detectWidth, detectHeight));
      const ratio = window.devicePixelRatio || 1;
      overlay.width = Math.max(1, Math.round(overlay.clientWidth * ratio));
      overlay.height = Math.max(1, Math.round(overlay.clientHeight * ratio));
      drawQuadOverlay(overlay, quad, detectWidth, detectHeight, video.videoWidth, video.videoHeight);
    };
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [cameraMode, draft]);

  const addResult = (result: Awaited<ReturnType<typeof scanPhoto>>, id: string, originalBlob: Blob) => {
    setPages((current) => [
      ...current,
      {
        id,
        file: result.file,
        url: result.previewUrl,
        originalBlob,
        warpedBlob: result.warpedBlob,
      },
    ]);
  };

  const openDraft = async (blob: Blob, name: string) => {
    setBusy('Finding page edges…');
    setError('');
    try {
      const next = await prepareCrop(blob, name.replace(/\.[^.]+$/, '') + '.jpg');
      setDraft(next);
    } catch (err) {
      setReplacingId(null);
      setError(err instanceof Error ? err.message : 'Could not open this photo');
    } finally {
      setBusy('');
    }
  };

  const captureLive = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy('Finding page edges…');
    setError('');
    try {
      const frame = document.createElement('canvas');
      frame.width = video.videoWidth;
      frame.height = video.videoHeight;
      const context = frame.getContext('2d');
      if (!context) throw new Error('Could not capture this page');
      context.drawImage(video, 0, 0);
      const originalBlob = await new Promise<Blob>((resolve, reject) => {
        frame.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not capture this page'))), 'image/jpeg', 0.95);
      });
      await openDraft(originalBlob, `scan-${pagesRef.current.length + 1}.jpg`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not capture this page');
      setBusy('');
    }
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const file = list[0];
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name)) {
      setError('Use the camera or a photo of the page.');
      return;
    }
    await openDraft(file, file.name);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (libraryInputRef.current) libraryInputRef.current.value = '';
  };

  const confirmDraft = async () => {
    if (!draft) return;
    setBusy('Straightening the page…');
    setError('');
    try {
      const result = await scanPhoto(draft.blob, filterRef.current, draft.fileName, { quad: draft.quad });
      if (replacingId) {
        setPages((current) =>
          current.map((page) => {
            if (page.id !== replacingId) return page;
            URL.revokeObjectURL(page.url);
            return {
              ...page,
              file: result.file,
              url: result.previewUrl,
              originalBlob: draft.blob,
              warpedBlob: result.warpedBlob,
            };
          }),
        );
      } else {
        addResult(result, `${draft.fileName}-${Date.now()}`, draft.blob);
      }
      URL.revokeObjectURL(draft.previewUrl);
      setDraft(null);
      setReplacingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not straighten this page');
    } finally {
      setBusy('');
    }
  };

  const discardDraft = () => {
    if (draft) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    setReplacingId(null);
  };

  const removePage = (id: string) => {
    setPages((current) => {
      const target = current.find((page) => page.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((page) => page.id !== id);
    });
  };

  const adjustPage = async (page: ScanPage) => {
    setReplacingId(page.id);
    await openDraft(page.originalBlob, page.file.name);
  };

  const changeFilter = async (next: ScanFilter) => {
    setFilter(next);
    if (pagesRef.current.length === 0) return;
    setBusy('Applying filter…');
    try {
      const updated: ScanPage[] = [];
      for (const page of pagesRef.current) {
        const file = await rescanWithFilter(page.warpedBlob, next, page.file.name);
        URL.revokeObjectURL(page.url);
        updated.push({ ...page, file, url: URL.createObjectURL(file) });
      }
      setPages(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply that filter');
    } finally {
      setBusy('');
    }
  };

  const finish = () => {
    if (pages.length === 0) {
      setError('Scan at least one page.');
      return;
    }
    onComplete(pages.map((page) => page.file));
  };

  return (
    <div className="space-y-4">
      {draft ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Adjust the page edges</h3>
          <p className="mt-1 text-sm text-gray-600">
            {draft.detected
              ? 'Drag the corners onto the page, then keep it.'
              : 'We could not find the page. Drag the corners onto the edges, then keep it.'}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Scan pages</h3>
          <p className="mt-1 text-sm text-gray-600">
            Line the page up in the frame. After capture you can drag the corners before we straighten it.
          </p>
        </div>
      )}

      <input
        id={cameraInputId}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void addFiles(event.target.files)}
      />
      <input
        id={libraryInputId}
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void addFiles(event.target.files)}
      />

      {cameraMode !== 'file' ? (
        <div className={`relative overflow-hidden rounded-xl bg-black ${draft ? 'hidden' : ''}`}>
          <video
            ref={videoRef}
            className="h-auto w-full max-h-[55vh] object-contain"
            playsInline
            muted
            autoPlay
            aria-label="Document camera"
          />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {cameraMode === 'pending' ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Opening camera…</p>
          ) : null}
        </div>
      ) : null}

      {draft ? (
        <ScanCropAdjust
          src={draft.previewUrl}
          width={draft.width}
          height={draft.height}
          quad={draft.quad}
          onChange={(quad: Quad) => setDraft((current) => (current ? { ...current, quad } : current))}
        />
      ) : null}

      {!draft && pages.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pages.map((page, index) => (
            <li key={page.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.url} alt={`Page ${index + 1}`} className="h-36 w-full object-contain bg-gray-100" />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-xs font-medium text-gray-600">Page {index + 1}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void adjustPage(page)} className="text-xs font-medium text-gray-700 hover:underline">
                    Adjust crop
                  </button>
                  <button type="button" onClick={() => removePage(page.id)} className="text-xs font-medium text-red-700 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : !draft && cameraMode === 'file' ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
          No pages yet.
        </div>
      ) : null}

      {!draft ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">Look</legend>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void changeFilter(item.id)}
                className={`min-h-10 rounded-full border px-3 text-sm font-medium ${
                  filter === item.id
                    ? 'border-coral bg-blue-50 text-coral'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {busy ? <p className="text-sm text-gray-600" role="status">{busy}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {draft ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void confirmDraft()}
            disabled={Boolean(busy)}
            className="min-h-12 rounded-xl bg-coral px-4 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
          >
            Keep page
          </button>
          <button
            type="button"
            onClick={discardDraft}
            disabled={Boolean(busy)}
            className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Retake
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {cameraMode === 'live' ? (
            <button
              type="button"
              onClick={() => void captureLive()}
              disabled={Boolean(busy)}
              className="min-h-12 rounded-xl bg-coral px-4 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
            >
              {pages.length === 0 ? 'Capture page' : 'Capture another page'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={Boolean(busy) || cameraMode === 'pending'}
              className="min-h-12 rounded-xl bg-coral px-4 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
            >
              {pages.length === 0 ? 'Take photo' : 'Add another page'}
            </button>
          )}
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={Boolean(busy)}
            className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Choose photo
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={pages.length === 0 || Boolean(busy)}
            className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Done
          </button>
          <button type="button" onClick={onCancel} className="min-h-12 rounded-xl px-4 text-base font-medium text-gray-700 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
