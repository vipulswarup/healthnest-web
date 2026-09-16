'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';

const NATIVE_SCHEME = 'sanovault://auth';

export default function NativeBridgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin?native=1');
      return;
    }

    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/auth/mobile/session', { method: 'POST' });
        const body = await response.json() as { token?: string; error?: string };
        if (!response.ok || !body.token) {
          throw new Error(body.error || 'Could not start the app session');
        }
        if (!active) return;
        window.location.assign(`${NATIVE_SCHEME}?token=${encodeURIComponent(body.token)}`);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not open the app');
      }
    })();

    return () => { active = false; };
  }, [router, session, status]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-950">Opening SanoVault</h1>
      <p className="mt-2 max-w-md text-base text-gray-600">
        {error || 'Return to the app. If nothing happens, open SanoVault from the Home Screen.'}
      </p>
    </main>
  );
}
