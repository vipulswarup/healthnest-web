export const CANONICAL_SITE_URL = 'https://sanovault.com';
export const SITE_NAME = 'SanoVault';
export const SITE_TAGLINE = "One vault for your family's health";
export const SITE_TITLE = 'SanoVault — Family Health Records in One Private Folder';
export const SITE_DESCRIPTION =
  'Keep medical documents, medications, and family health records in one private folder. Upload reports, get doctor-ready summaries, and share only what you choose.';

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || CANONICAL_SITE_URL).replace(/\/$/, '');
}
