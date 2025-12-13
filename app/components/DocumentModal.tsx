'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentPath: string;
  fileName?: string;
}

export default function DocumentModal({ isOpen, onClose, documentPath, fileName }: DocumentModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  const getFileType = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif'].includes(extension || '')) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  const fileType = useMemo(() => {
    return documentPath ? getFileType(documentPath) : 'unknown';
  }, [documentPath]);

  const fetchSignedUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/documents/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document URL');
      }

      const data = await response.json();
      setSignedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentPath]);

  useEffect(() => {
    if (isOpen && documentPath) {
      fetchSignedUrl();
      setPdfLoadError(false);
    } else {
      setSignedUrl(null);
      setError(null);
      setPdfLoadError(false);
    }
  }, [isOpen, documentPath, fetchSignedUrl]);

  useEffect(() => {
    if (signedUrl && fileType === 'pdf' && !pdfLoadError) {
      // Set a timeout to detect if PDF doesn't load (likely CORS issue)
      const timeout = setTimeout(() => {
        // Check if iframe is still blank/empty
        const iframe = document.querySelector('iframe[title="' + (fileName || 'PDF Document') + '"]') as HTMLIFrameElement;
        if (iframe) {
          try {
            // Try to access iframe content
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            // If we can't access it and it's been 3 seconds, likely CORS issue
            if (!iframeDoc) {
              setPdfLoadError(true);
            }
          } catch (e) {
            // CORS error - PDF can't be displayed in iframe
            setPdfLoadError(true);
          }
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [signedUrl, fileType, pdfLoadError, fileName]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
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
          className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {fileName || 'Document'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0175C2]"></div>
                  <p className="ml-3 text-gray-600">Loading document...</p>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {signedUrl && !loading && (
                <div className="w-full">
                  {fileType === 'image' ? (
                    <img
                      src={signedUrl}
                      alt={fileName || 'Document'}
                      className="max-w-full h-auto mx-auto rounded-lg"
                      onError={() => setError('Failed to load image')}
                    />
                  ) : fileType === 'pdf' ? (
                    <div className="w-full">
                      {pdfLoadError ? (
                        <div className="text-center py-12 border border-gray-300 rounded-lg bg-gray-50">
                          <p className="text-gray-600 mb-4">
                            PDF cannot be displayed in the modal due to browser security restrictions.
                          </p>
                          <a
                            href={signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors"
                          >
                            Open PDF in New Tab
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-[600px] border border-gray-300 rounded-lg overflow-hidden bg-gray-100 relative">
                          <iframe
                            key={signedUrl}
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                            className="w-full h-full"
                            title={fileName || 'PDF Document'}
                            allow="fullscreen"
                            style={{ border: 'none' }}
                            onError={() => {
                              // Fallback to direct URL if Google viewer fails
                              const iframe = document.querySelector('iframe[title="' + (fileName || 'PDF Document') + '"]') as HTMLIFrameElement;
                              if (iframe) {
                                iframe.src = `${signedUrl}#toolbar=1&navpanes=1&scrollbar=1`;
                              }
                            }}
                          />
                          <div className="absolute top-2 right-2 z-10">
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-white px-3 py-1 rounded shadow-sm text-[#0175C2] hover:bg-gray-50 transition-colors"
                              title="Open in new tab if PDF doesn't display"
                            >
                              Open in New Tab
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                      <a
                        href={signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors"
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
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-[#0175C2] px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-[#015a96] sm:mt-0 sm:w-auto sm:text-sm"
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

