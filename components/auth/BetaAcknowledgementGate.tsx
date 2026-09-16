'use client';

import { useSession } from '@/lib/auth/client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ACKNOWLEDGEMENT_PATH = '/beta-acknowledgement';

export default function BetaAcknowledgementGate() {
  const pathname = usePathname();
  if (
    pathname === '/'
    || pathname === '/privacy'
    || pathname === '/pricing'
    || pathname === '/dashboard'
    || pathname === ACKNOWLEDGEMENT_PATH
    || pathname.startsWith('/auth/')
  ) {
    return null;
  }
  return <BetaAcknowledgementChecker pathname={pathname} />;
}

function BetaAcknowledgementChecker({ pathname }: { pathname: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated' || pathname === ACKNOWLEDGEMENT_PATH) return;

    let active = true;
    void fetch('/api/users/beta-acknowledgement', { cache: 'no-store' })
      .then(async (response) => ({ response, body: await response.json() as { acknowledged?: boolean } }))
      .then(({ response, body }) => {
        if (!active || !response.ok || body.acknowledged) return;
        const callbackUrl = pathname;
        router.replace(`${ACKNOWLEDGEMENT_PATH}?${new URLSearchParams({ callbackUrl })}`);
      })
      .catch(() => {
        // Do not redirect on a transient network error. Health-data APIs still
        // enforce acknowledgement server-side and therefore fail closed.
      });

    return () => { active = false; };
  }, [pathname, router, session?.user?.id, status]);

  return null;
}
