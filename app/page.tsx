import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { LandingPage } from '@/components/marketing/LandingPage';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export default async function Home() {
  try {
    const user = await getAuthenticatedUser();
    if (user) redirect('/dashboard');
  } catch {
    // Session lookup must never blank the public page for crawlers or visitors.
  }

  return <LandingPage />;
}
