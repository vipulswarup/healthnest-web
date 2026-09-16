import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'SanoVault is free to use during the beta. AI extraction and summaries may become paid later.',
  alternates: { canonical: '/pricing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing',
    description: 'SanoVault is free to use during the beta. AI extraction and summaries may become paid later.',
    url: '/pricing',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-silver/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={40} height={40} className="rounded-full" />
            <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
          </Link>
          <Link href="/auth/signup" className="text-sm font-medium text-coral hover:underline">
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-coral">Beta</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-4 text-lg leading-7 text-blue-slate">
          SanoVault is free to use right now. There is no paid plan, and we will not charge you without saying so in the product first.
        </p>

        <div className="mt-10 rounded-2xl border border-coral/30 bg-coral/5 p-6 sm:p-8">
          <p className="text-sm font-semibold text-coral">Current plan</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Free</h2>
          <p className="mt-2 text-sm leading-6 text-blue-slate">
            Everything in the beta is included: family folder, uploads, medicines, sharing, and AI help.
          </p>
          <Link href="/auth/signup" className="sv-btn sv-btn-primary mt-6">
            Create a folder
          </Link>
        </div>

        <h2 className="mt-12 text-xl font-semibold">What is included today</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-slate">
          <li>Family profiles and household access</li>
          <li>Upload and store reports, prescriptions, and other records</li>
          <li>Medicine lists and clinic-ready printouts</li>
          <li>Time-limited share links</li>
          <li>AI extraction, tagging, and summaries from documents you add</li>
        </ul>

        <h2 className="mt-12 text-xl font-semibold">What may change</h2>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          Later, AI features such as document extraction and summaries may become paid. Storing your folder, adding people, and keeping medicines and files may stay available without that charge. If a paid plan is introduced, existing users will see it in the app before anything is billed.
        </p>
        <p className="mt-3 text-sm leading-6 text-blue-slate">
          There is no price to announce yet. This page will be updated when there is one.
        </p>

        <p className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          <Link href="/" className="text-coral hover:underline">Back to SanoVault</Link>
          <Link href="/privacy" className="text-coral hover:underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
