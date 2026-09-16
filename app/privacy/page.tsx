import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BETA_ACKNOWLEDGEMENT_TEXT } from '@/lib/legal/beta-acknowledgement';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How SanoVault stores family health records, what the beta covers, and how sharing works.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy',
    description: 'How SanoVault stores family health records, what the beta covers, and how sharing works.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-silver/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={40} height={40} className="rounded-full" />
            <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
        <p className="mt-4 text-sm leading-6 text-blue-slate">{BETA_ACKNOWLEDGEMENT_TEXT}</p>

        <h2 className="mt-10 text-xl font-semibold">What you put in the folder</h2>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          SanoVault stores the health records, medicine lists, and family profiles you add, so your household can find them later.
          Files you upload are kept in private storage and shown only to people in your folder, unless you create a share link.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Sharing</h2>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          You can send a time-limited link for a specific record. That link is not listed on this website. You can stop sharing
          from the app. SanoVault does not publish a public health profile.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Accounts</h2>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          Sign-in uses Google or an email link, and a password if you set one. Session cookies stay on sanovault.com so you can
          open your folder on the web and in the SanoVault app.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Not medical advice</h2>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          Summaries and extracted text are for your records. They are not a diagnosis, a prescription, or a substitute for a clinician.
        </p>

        <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/" className="text-sm font-medium text-coral hover:underline">
            Back to SanoVault
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-coral hover:underline">
            Pricing
          </Link>
        </p>
      </main>
    </div>
  );
}
