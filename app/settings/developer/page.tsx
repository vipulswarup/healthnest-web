'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AppNav from '@/components/layout/AppNav';
import { useToast } from '@/components/ui/ToastProvider';

type ApiToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export default function DeveloperSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { notify } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState('Sync token');
  const [createdToken, setCreatedToken] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/api-tokens');
    if (response.ok) setTokens(await response.json());
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
    if (status === 'authenticated') void load();
  }, [status, router, load]);

  const create = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not create token');
      setCreatedToken(body.token);
      await navigator.clipboard.writeText(body.token).catch(() => undefined);
      notify('API token created. Copy it now — it will not be shown again.', 'success');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create token', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const response = await fetch(`/api/api-tokens/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      notify('Could not revoke token', 'error');
      return;
    }
    notify('Token revoked.', 'success');
    await load();
  };

  if (status === 'loading') {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-ink">API access</h1>
        <p className="mt-2 text-gray-600">
          Create a long-lived read/write API token for scripts and scheduled sync.
          App sessions stay signed in for about 90 days on mobile.
        </p>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create token</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Token name"
            />
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void create()}
              className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
          {createdToken ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Copy this token now</p>
              <code className="mt-2 block break-all text-sm text-amber-950">{createdToken}</code>
              <p className="mt-2 text-xs text-amber-800">Authorization: Bearer {'<token>'}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Your tokens</h2>
          {tokens.length === 0 ? (
            <p className="text-sm text-gray-600">No tokens yet.</p>
          ) : tokens.map((token) => (
            <article key={token.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{token.name}</p>
                  <p className="text-sm text-gray-600">{token.tokenPrefix}…</p>
                  <p className="text-xs text-gray-500">
                    {token.revokedAt
                      ? 'Revoked'
                      : `Created ${new Date(token.createdAt).toLocaleDateString()}${token.lastUsedAt ? ` · Last used ${new Date(token.lastUsedAt).toLocaleString()}` : ''}`}
                  </p>
                </div>
                {!token.revokedAt ? (
                  <button
                    type="button"
                    onClick={() => void revoke(token.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
