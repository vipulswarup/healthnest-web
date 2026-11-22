import { isMarketingPath } from '@/lib/marketing-routes';

export const CONSENT_KEY = 'sanovault.cookie-consent.v1';
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
export type Consent = { analytics: boolean; savedAt: number };

export function parseConsent(value: string | null, now = Date.now()): Consent | null {
  try {
    const consent = JSON.parse(value || 'null');
    if (typeof consent?.analytics !== 'boolean' || typeof consent.savedAt !== 'number'
      || !Number.isFinite(consent.savedAt) || consent.savedAt > now
      || now - consent.savedAt >= CONSENT_MAX_AGE) return null;
    return { analytics: consent.analytics, savedAt: consent.savedAt };
  } catch { return null; }
}

/** An exact allowlist prevents health-record IDs, tokens and search terms leaking. */
export function publicAnalyticsUrl(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin);
    return url.origin === origin && isMarketingPath(url.pathname)
      ? `${url.origin}${url.pathname}` : null;
  } catch { return null; }
}
