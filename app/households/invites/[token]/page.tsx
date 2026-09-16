'use client';

import { useSession } from '@/lib/auth/client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppNav from '@/components/layout/AppNav';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';

type InvitePreview = {
  invite: {
    householdName?: string;
    status: string;
    invitedByName?: string;
    expiresAt: string;
  };
  authenticated?: boolean;
};

export default function AcceptInvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refresh } = useHouseholdContext();
  const params = useParams();
  const token = String(params.token || '');

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const invitePath = `/households/invites/${token}`;
  const authQuery = useMemo(
    () => new URLSearchParams({ callbackUrl: invitePath }).toString(),
    [invitePath]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/households/invites/${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite not found');
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === 'loading') return;
    void load();
  }, [status, session?.user?.id, load]);

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientIds: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept');
      await refresh();
      router.push(`/households/${data.householdId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decline: true, patientIds: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline');
      router.push('/households');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
      setBusy(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto" />
          <p className="mt-4 text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  const invite = preview?.invite;
  const householdName = invite?.householdName || 'the family folder';
  const inviterName = invite?.invitedByName || 'Someone';
  const isPending = invite?.status === 'pending';

  // Logged-out: invite pending gate with create / sign-in.
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo.png"
                alt="SanoVault Logo"
                width={64}
                height={64}
                className="rounded-full"
                priority
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-coral">
              Invite pending
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              You&apos;re invited to join {householdName}
            </h1>
            {invite && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>{inviterName}</strong> invited you to the family health folder.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!invite && !error && (
            <p className="text-sm text-gray-600 text-center">Invite not found.</p>
          )}

          {invite && !isPending && (
            <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
              This invite is <strong>{invite.status}</strong> and can no longer be accepted.
            </div>
          )}

          {invite && isPending && (
            <div className="space-y-3">
              <Link
                href={`/auth/signin?${authQuery}`}
                className="flex min-h-12 w-full justify-center rounded-lg bg-coral px-4 py-3 text-base font-medium text-white hover:bg-coral-strong transition-colors"
              >
                Join with Google
              </Link>
              <Link
                href={`/auth/signin?${authQuery}`}
                className="flex min-h-12 w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Use a sign-in link or password
              </Link>
              <p className="text-sm text-center text-gray-500">
                After you sign in, this page will add you to the family folder.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AppNav />
      <main className="max-w-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          <h1 className="text-2xl font-bold text-gray-900">Join the family folder</h1>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          {preview && (
            <>
              <p className="text-gray-800">
                <strong>{inviterName}</strong> invited you to {householdName}.
              </p>

              {isPending && (
                <>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void accept()}
                      className="min-h-12 rounded-lg bg-coral px-4 py-3 text-base font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                    >
                      {busy ? 'Joining...' : 'Join family folder'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decline()}
                      className="min-h-12 px-4 text-base font-medium text-gray-700 hover:underline disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </>
              )}

              {!isPending && (
                <Link href="/households" className="text-sm text-coral hover:underline">
                  Back to who can see this
                </Link>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
