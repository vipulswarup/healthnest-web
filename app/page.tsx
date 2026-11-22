import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { LandingPage } from '@/components/marketing/LandingPage';
import { publicPageMetadata } from '@/lib/seo';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site';

export const metadata: Metadata = publicPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default async function Home() {
  // Anonymous visitors do not need a remote auth round trip before seeing the site.
  const requestHeaders = await headers();
  if (!requestHeaders.has('cookie') && !requestHeaders.has('authorization')) return <LandingPage />;
  let user = null;
  try {
    user = await getAuthenticatedUser();
  } catch {
    // Session lookup must never blank the public page for crawlers or visitors.
  }

  if (user) redirect('/dashboard');
  return <LandingPage />;
}
