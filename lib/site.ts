export const CANONICAL_SITE_URL = 'https://www.sanovault.com';
export const SITE_NAME = 'SanoVault';
export const SITE_TAGLINE = 'Family health records, ready for every visit';
export const SITE_TITLE = 'Family health records, ready for every visit | SanoVault';
export const SITE_DESCRIPTION =
  'SanoVault helps families organise lab reports, prescriptions, scans, medicines and visit notes from different providers in one searchable place.';

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || CANONICAL_SITE_URL).replace(/\/$/, '');
}

export const APP_STORE_URL = 'https://apps.apple.com/us/app/sanovault/id6812724169';
