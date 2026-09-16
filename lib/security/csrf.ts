export type CsrfOriginContext = {
  origin: string | null;
  requestOrigin: string;
  configuredAppUrl?: string;
  nodeEnv?: string;
  vercelEnv?: string;
};

/**
 * Validates the Origin header for cookie-authenticated mutations. Production
 * accepts only the configured public app origin (and its canonical www/apex
 * alias); local and preview deployments may use their own same-origin address
 * for testing.
 */
export function hasTrustedMutationOrigin({
  origin,
  requestOrigin,
  configuredAppUrl,
  nodeEnv,
  vercelEnv,
}: CsrfOriginContext): boolean {
  if (!origin) return false;

  let configuredOrigin: string | null = null;
  if (configuredAppUrl) {
    try {
      configuredOrigin = new URL(configuredAppUrl).origin;
    } catch {
      // A malformed configuration must never broaden the set of trusted origins.
      return false;
    }
  }

  if (configuredOrigin) {
    const configuredUrl = new URL(configuredOrigin);
    const canonicalOrigins = new Set([configuredOrigin]);
    const hostname = configuredUrl.hostname;

    // A deployment may serve the same controlled site on both sanovault.com
    // and www.sanovault.com while only one is stored in Vercel's environment.
    // Allow exactly that counterpart, preserving the configured protocol/port;
    // never derive trust from an incoming Host header.
    if (hostname.startsWith('www.')) {
      configuredUrl.hostname = hostname.slice(4);
      canonicalOrigins.add(configuredUrl.origin);
    } else if (hostname && !hostname.includes(':')) {
      configuredUrl.hostname = `www.${hostname}`;
      canonicalOrigins.add(configuredUrl.origin);
    }

    if (canonicalOrigins.has(origin)) return true;
  }

  return (nodeEnv !== 'production' || vercelEnv === 'preview') && origin === requestOrigin;
}
