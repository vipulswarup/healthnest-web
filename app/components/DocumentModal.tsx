'use client';

import { useEffect, useState, useMemo, useCallback, useId, useRef } from 'react';
import Image from 'next/image';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  fileName?: string;
}

export default function DocumentModal({ isOpen, onClose, documentId, fileName }: DocumentModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentFileType, setDocumentFileType] = useState<string | null>(null);

  const fileType = useMemo(() => documentFileType?.startsWith('image/') ? 'image' : documentFileType === 'application/pdf' ? 'pdf' : 'unknown', [documentFileType]);

  const fetchSignedUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/documents/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document URL');
      }

      const data = await response.json();
      setSignedUrl(data.url);
      setDownloadUrl(data.downloadUrl || data.url);
      setDocumentFileType(data.fileType || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchSignedUrl();
    } else {
      setSignedUrl(null);
      setDownloadUrl(null);
      setError(null);
    }
  }, [isOpen, documentId, fetchSignedUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={titleId}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        ></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div
          ref={dialogRef}
          tabIndex={-1}
          className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id={titleId}>
                {fileName || 'Document'}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close document preview"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              {loading && (
                <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
                  <p className="ml-3 text-gray-600">Loading document...</p>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4" role="alert">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {signedUrl && !loading && (
                <div className="w-full">
                  {fileType === 'image' ? (
                    <Image
                      src={signedUrl}
                      alt={fileName || 'Document'}
                      width={1200}
                      height={1600}
                      unoptimized
                      className="max-w-full h-auto mx-auto rounded-lg"
                      onError={() => setError('Failed to load image')}
                    />
                  ) : fileType === 'pdf' ? (
                    <div className="w-full">
                        <div className="w-full h-[600px] border border-gray-300 rounded-lg overflow-hidden bg-gray-100 relative">
                          <iframe
                            key={signedUrl}
                            src={signedUrl}
                            className="w-full h-full"
                            title={fileName || 'PDF Document'}
                            allow="fullscreen"
                            style={{ border: 'none' }}
                          />
                          <div className="absolute top-2 right-2 z-10">
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-white px-3 py-1 rounded shadow-sm text-coral hover:bg-gray-50 transition-colors"
                              title="Open in new tab if PDF doesn't display"
                            >
                              Open in New Tab
                            </a>
                          </div>
                        </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                      <a
                        href={downloadUrl || signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 bg-coral text-white rounded-lg hover:bg-coral-strong transition-colors"
                      >
                        Download Document
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
            {signedUrl && (
              <a
                href={downloadUrl || signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-coral px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-coral-strong sm:mt-0 sm:w-auto sm:text-sm"
              >
                Open in New Tab
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
