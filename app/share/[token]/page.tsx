'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type SharePayload = {
  label: string;
  fileName: string;
  fileType: string;
  expiresAt: string;
  fileUrl: string;
};

export default function PublicSharePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const [share, setShare] = useState<SharePayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/share/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Share link not found');
        if (!cancelled) setShare(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Share link not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600">
        Loading shared record…
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Link unavailable</h1>
          <p className="mt-2 text-gray-600">{error || 'This share link has expired or been stopped.'}</p>
          <Link href="/" className="mt-6 inline-block text-coral hover:underline">Go to SanoVault</Link>
        </div>
      </div>
    );
  }

  const fileType = share.fileType.startsWith('image/') ? 'image' : share.fileType === 'application/pdf' ? 'pdf' : 'other';
  const expiry = new Date(share.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium text-coral">SanoVault shared record</p>
            <h1 className="text-xl font-semibold text-gray-950">{share.label}</h1>
            <p className="mt-1 text-sm text-gray-600">Link expires {expiry}</p>
          </div>
          <a
            href={share.fileUrl}
            className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong"
          >
            Download
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fileType === 'image' ? (
            <div className="p-4">
              <Image
                src={share.fileUrl}
                alt={share.label}
                width={1200}
                height={1600}
                unoptimized
                className="mx-auto h-auto max-w-full rounded-lg"
              />
            </div>
          ) : fileType === 'pdf' ? (
            <iframe
              src={share.fileUrl}
              title={share.label}
              className="h-[80vh] w-full border-0"
            />
          ) : (
            <div className="p-10 text-center">
              <p className="text-gray-600">Preview not available for this file type.</p>
              <a href={share.fileUrl} className="mt-4 inline-block text-coral hover:underline">Download file</a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
