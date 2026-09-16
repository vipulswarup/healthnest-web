'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'sanovault.a2hs.dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone);
}

function isAppleDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (pathname !== '/dashboard') return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    if (isStandalone()) return;
    setIos(isAppleDevice());
    const timer = window.setTimeout(() => setVisible(true), 4000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore private-mode quota errors.
    }
    setVisible(false);
  };

  return (
    <div className="print:hidden fixed inset-x-0 bottom-20 z-40 border-t border-blue-200 bg-white p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] xl:bottom-4 sm:inset-x-auto sm:right-4 sm:max-w-sm sm:rounded-2xl sm:border">
      <p className="text-base font-semibold text-gray-950">Add SanoVault to your Home Screen</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        {ios
          ? 'Tap the Share button, then Add to Home Screen. After that you will not need the website address.'
          : 'Use your browser menu and choose Add to Home Screen or Install app. After that you will not need the website address.'}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-4 min-h-11 w-full rounded-lg bg-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-coral-strong"
      >
        I have added it
      </button>
    </div>
  );
}
