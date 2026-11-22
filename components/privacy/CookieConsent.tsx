'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { CONSENT_KEY, parseConsent, publicAnalyticsUrl, type Consent } from '@/lib/analytics';
import { isMarketingPath } from '@/lib/marketing-routes';

const Analytics = dynamic(() => import('@vercel/analytics/react').then(module => module.Analytics), { ssr: false });

function privacySignal(): boolean {
  return navigator.doNotTrack === '1'
    || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function analyticsAllowed(): boolean {
  try {
    return !privacySignal() && parseConsent(localStorage.getItem(CONSENT_KEY))?.analytics === true;
  } catch { return false; }
}

export function CookieSettingsButton() {
  return <button type="button" className="min-h-11 text-left hover:underline" onClick={() => window.dispatchEvent(new Event('sanovault:cookie-settings'))}>Cookie settings</button>;
}

export default function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [signal, setSignal] = useState(false);

  useEffect(() => {
    const sync = () => {
      let saved: Consent | null = null;
      try { saved = parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { /* Optional analytics stays off. */ }
      setConsent(saved);
      setSignal(privacySignal());
      setReady(true);
    };
    const show = () => setOpen(true);
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('sanovault:cookie-settings', show);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('sanovault:cookie-settings', show);
    };
  }, []);

  const choose = (analytics: boolean) => {
    const wasAllowed = analyticsAllowed();
    const next = { analytics: analytics && !privacySignal(), savedAt: Date.now() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch { next.analytics = false; }
    setConsent(next);
    setOpen(false);
    // A reload also removes any SDK listeners installed before withdrawal.
    if (wasAllowed && !next.analytics) window.location.reload();
  };

  const publicPage = isMarketingPath(pathname);
  return <>
    {ready && consent?.analytics && !signal && publicPage && <Analytics
      route={pathname}
      path={pathname}
      scriptSrc="/_vercel/insights/script.js"
      beforeSend={event => {
        if (!analyticsAllowed() || !isMarketingPath(window.location.pathname)) return null;
        const url = publicAnalyticsUrl(event.url, window.location.origin);
        return url ? { ...event, url } : null;
      }}
    />}
    {ready && (open || (!consent && publicPage)) && <section
      role="region" aria-labelledby="cookie-heading"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto border-t border-silver bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg print:hidden sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-3xl sm:rounded-2xl sm:border sm:p-6"
    >
      <h2 id="cookie-heading" className="text-lg font-bold">Your cookie choices</h2>
      <p className="mt-2 text-sm leading-6 text-blue-slate">We use essential cookies for secure sign-in and browser storage for your preferences. With your permission, optional analytics helps us understand visits to public pages. Health records and private pages are excluded. <Link href="/privacy" className="text-coral underline">Privacy Policy</Link></p>
      {signal && <p className="mt-2 text-sm text-blue-slate">Your browser privacy preference keeps optional analytics off.</p>}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => choose(false)} className="sv-btn sv-btn-outline">Essential only</button>
        <button type="button" onClick={() => choose(true)} disabled={signal} className="sv-btn sv-btn-outline disabled:opacity-50">Allow analytics</button>
      </div>
    </section>}
  </>;
}
