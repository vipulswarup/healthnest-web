'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/layout/AppNav';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';

type Household = { id: string; name: string; createdBy: string; createdAt: string };
type PendingInvite = {
  id: string;
  householdId: string;
  householdName?: string;
  email: string;
  token: string;
  invitedByName?: string;
  expiresAt: string;
};

export default function HouseholdsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refresh } = useHouseholdContext();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [hRes, pRes] = await Promise.all([
        fetch('/api/households'),
        fetch('/api/households/invites/pending'),
      ]);
      if (!hRes.ok) throw new Error('Failed to load households');
      setHouseholds(await hRes.json());
      if (pRes.ok) setPending(await pRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    void load();
  }, [session, status, router, load]);

  const createHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create household');
      setName('');
      await refresh();
      router.push(`/households/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Who Can See This</h1>
          <p className="text-gray-600 text-sm mb-6">
            Invite family so they can open the same reports. WhatsApp is the easiest way to send the link.
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={createHousehold} className="flex flex-col sm:flex-row gap-3 mb-8">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name (e.g. Swarup family)"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-500"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-coral text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-coral-strong disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create folder'}
            </button>
          </form>

          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending invitations</h2>
              <ul className="space-y-2">
                {pending.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{invite.householdName || 'Household'}</p>
                      <p className="text-sm text-gray-600">
                        From {invite.invitedByName || 'a member'} · expires{' '}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/households/invites/${invite.token}`}
                      className="text-sm font-medium text-coral hover:underline shrink-0"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your folders</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : households.length === 0 ? (
            <p className="text-gray-500 text-sm">You are not in a family folder yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {households.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/households/${h.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{h.name}</span>
                    <span className="text-sm text-coral">Manage</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
