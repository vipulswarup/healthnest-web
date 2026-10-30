'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AppNav from '@/components/layout/AppNav';
import { useToast } from '@/components/ui/ToastProvider';

type Patient = { id: string; firstName: string; lastName?: string };
type CareShare = {
  id: string;
  token: string;
  label: string | null;
  invitedEmail: string | null;
  shareUrl: string;
  patientIds: string[];
  lastViewedAt: string | null;
  viewCount: number;
  revokedAt: string | null;
  createdAt: string;
};

export default function CareSharesPage() {
  const { status } = useSession();
  const router = useRouter();
  const { notify } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [shares, setShares] = useState<CareShare[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [patientsRes, sharesRes] = await Promise.all([
      fetch('/api/patients'),
      fetch('/api/care-shares'),
    ]);
    if (patientsRes.ok) setPatients(await patientsRes.json());
    if (sharesRes.ok) setShares(await sharesRes.json());
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    if (status === 'authenticated') void load();
  }, [status, router, load]);

  const togglePatient = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const createShare = async () => {
    if (!selected.length) {
      setError('Select at least one patient');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/care-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientIds: selected,
          label: label.trim() || undefined,
          invitedEmail: email.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not create share');
      await navigator.clipboard.writeText(body.shareUrl).catch(() => undefined);
      notify(email.trim() ? 'Invite created. Link copied.' : 'Share link created and copied.', 'success');
      setSelected([]);
      setLabel('');
      setEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create share');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    const response = await fetch(`/api/care-shares/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      notify('Could not revoke share', 'error');
      return;
    }
    notify('Share revoked.', 'success');
    await load();
  };

  const patientName = (id: string) => {
    const patient = patients.find((item) => item.id === id);
    return patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : id;
  };

  if (status === 'loading') {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-ink">Share with a doctor</h1>
        <p className="mt-2 text-gray-600">
          Create a view-only link for one or more patients. Share it on WhatsApp, or email an invite.
          Access stays live until you revoke it.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">New share</h2>
          <div className="mt-4 space-y-3">
            {patients.map((patient) => (
              <label key={patient.id} className="flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={selected.includes(patient.id)}
                  onChange={() => togglePatient(patient.id)}
                />
                {[patient.firstName, patient.lastName].filter(Boolean).join(' ')}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="care-label">Label (optional)</label>
              <input id="care-label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Dr Sharma visit" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="care-email">Doctor email (optional)</label>
              <input id="care-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Leave blank for WhatsApp link" />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={creating}
            onClick={() => void createShare()}
            className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create share link'}
          </button>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Active and past shares</h2>
          {shares.length === 0 ? (
            <p className="text-sm text-gray-600">No shares yet.</p>
          ) : shares.map((share) => (
            <article key={share.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{share.label || 'Untitled share'}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {share.patientIds.map(patientName).join(', ')}
                  </p>
                  {share.invitedEmail ? <p className="mt-1 text-sm text-gray-600">Invited: {share.invitedEmail}</p> : null}
                  <p className="mt-1 text-xs text-gray-500">
                    {share.revokedAt
                      ? 'Revoked'
                      : `Views: ${share.viewCount}${share.lastViewedAt ? ` · Last viewed ${new Date(share.lastViewedAt).toLocaleString()}` : ''}`}
                  </p>
                </div>
                {!share.revokedAt ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(share.shareUrl);
                        notify('Link copied.', 'success');
                      }}
                    >
                      Copy link
                    </button>
                    <a
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      href={`https://wa.me/?text=${encodeURIComponent(`Please view these health records on SanoVault: ${share.shareUrl}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700"
                      onClick={() => void revoke(share.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ) : null}
              </div>
              {!share.revokedAt ? (
                <p className="mt-3 break-all text-xs text-gray-500">{share.shareUrl}</p>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
