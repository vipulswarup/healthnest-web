'use client';

import { useCallback, useEffect, useState } from 'react';
import { documentShareMessage, whatsappShareHref } from '@/lib/share/whatsapp';
import { useToast } from '@/components/ui/ToastProvider';

type ShareInfo = {
  id: string;
  token: string;
  shareUrl: string;
  label: string | null;
  expiresAt: string;
  createdAt: string;
};

type Props = {
  documentId: string;
  documentLabel: string;
  senderName: string;
};

export function DocumentSharePanel({ documentId, documentLabel, senderName }: Props) {
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const loadShare = useCallback(async () => {
    const response = await fetch(`/api/documents/${documentId}/share`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load share link');
    setShare(data.share || null);
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    setError('');
    void loadShare().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not load share link');
    });
  }, [loadShare, open]);

  async function createShare() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: documentLabel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create share link');
      setShare(data.share);
      notify('Share link ready.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create share link');
    } finally {
      setLoading(false);
    }
  }

  async function revokeShare() {
    if (!share || !window.confirm('Stop sharing this link? Anyone with the link will lose access.')) return;
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/documents/${documentId}/share`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not revoke share link');
      setShare(null);
      notify('Share link stopped.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke share link');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.shareUrl);
      notify('Link copied.', 'success');
    } catch {
      setError('Could not copy the link');
    }
  }

  async function sendEmail() {
    if (!email.trim()) {
      setError('Enter an email address');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/documents/${documentId}/share/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim(), label: documentLabel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send email');
      await loadShare();
      notify('Email sent.', 'success');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email');
    } finally {
      setLoading(false);
    }
  }

  const whatsappHref = share
    ? whatsappShareHref(documentShareMessage(senderName, documentLabel, share.shareUrl))
    : '';

  const expiryLabel = share
    ? new Date(share.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 hover:bg-gray-50 print:hidden"
      >
        Share link
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="document-share-title">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-5 shadow-sm">
            <h2 id="document-share-title" className="text-xl font-semibold text-gray-950">Share this record</h2>
            <p className="mt-1 text-sm text-gray-600">
              Anyone with the link can view this file for 7 days. You can stop sharing anytime.
            </p>

            {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}

            {!share ? (
              <div className="mt-5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void createShare()}
                  className="rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-60"
                >
                  {loading ? 'Creating link…' : 'Create share link'}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Public link
                  <input
                    readOnly
                    value={share.shareUrl}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <p className="text-sm text-gray-600">Expires {expiryLabel}</p>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void copyLink()} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50">
                    Copy link
                  </button>
                  <a
                    href={whatsappHref}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Send on WhatsApp
                  </a>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-900">Email the link</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="doctor@clinic.com"
                      className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void sendEmail()}
                      className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-60"
                    >
                      Send email
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void revokeShare()}
                  className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                >
                  Stop sharing
                </button>
              </div>
            )}

            <button type="button" onClick={() => setOpen(false)} className="mt-5 text-sm text-gray-700 hover:underline">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
