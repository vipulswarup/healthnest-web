import Image from 'next/image';
import Link from 'next/link';
import { BETA_ACKNOWLEDGEMENT_TEXT } from '@/lib/legal/beta-acknowledgement';
import {
  CANONICAL_SITE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from '@/lib/site';

const FEATURES = [
  {
    title: 'Family folder',
    description: 'Keep records for parents, children, and everyone you care for in one place, with clear access for the household.',
  },
  {
    title: 'Reports you can find',
    description: 'Upload lab PDFs and photos of prescriptions. SanoVault reads them so the right file is there when you need it.',
  },
  {
    title: 'Medicines',
    description: 'Track what each person takes and print a clinic-ready list instead of sorting through chat threads.',
  },
  {
    title: 'For the doctor',
    description: 'Take a one-page summary of labs, blood pressure, and medicines to the appointment.',
  },
  {
    title: 'Share on your terms',
    description: 'Send a time-limited link when someone needs a record. There is no public profile.',
  },
  {
    title: 'Private by design',
    description: 'This is a family folder, not a hospital system. You decide what goes in and who can see it.',
  },
] as const;

const STEPS = [
  {
    step: '1',
    title: 'Create a folder',
    description: 'Sign in with Google or an email link and add the people in your household.',
  },
  {
    step: '2',
    title: 'Put the papers in',
    description: 'Upload reports, prescriptions, and medicine lists from your phone or computer.',
  },
  {
    step: '3',
    title: 'Use it at the clinic',
    description: 'Open the record, print a summary, or send a link that expires on its own.',
  },
] as const;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      logo: `${CANONICAL_SITE_URL}/logo.png`,
    },
  ],
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-silver/70 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={40} height={40} className="rounded-full" priority />
            <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <Link href="/pricing" className="px-3 py-2 text-sm font-medium text-blue-slate hover:text-ink">
              Pricing
            </Link>
            <Link href="/auth/signin" className="px-3 py-2 text-sm font-medium text-blue-slate hover:text-ink">
              Sign in
            </Link>
            <Link href="/auth/signup" className="sv-btn sv-btn-primary !min-h-10 !px-4 !text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-br from-coral/10 via-white to-silver/30">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-coral">Family health folder</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {SITE_TAGLINE}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-7 text-blue-slate">
                {SITE_DESCRIPTION}
              </p>
              <p className="mt-3 text-sm font-medium text-ink">
                Free to use right now.{' '}
                <Link href="/pricing" className="text-coral hover:underline">See pricing</Link>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/signup" className="sv-btn sv-btn-primary">
                  Create a folder
                </Link>
                <Link href="/auth/signin" className="sv-btn sv-btn-outline">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="relative" aria-hidden="true">
              <div className="rounded-2xl border border-silver bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-coral">This week</p>
                <ul className="mt-4 space-y-3">
                  <li className="rounded-xl border border-silver/80 bg-background px-4 py-3">
                    <p className="text-sm font-semibold text-ink">Lab report</p>
                    <p className="mt-0.5 text-sm text-blue-slate">Filed for the household, ready to open</p>
                  </li>
                  <li className="rounded-xl border border-silver/80 bg-background px-4 py-3">
                    <p className="text-sm font-semibold text-ink">Medicine list</p>
                    <p className="mt-0.5 text-sm text-blue-slate">Printable for the next clinic visit</p>
                  </li>
                  <li className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">For the doctor</p>
                    <p className="mt-0.5 text-sm text-blue-slate">One-page summary of labs, BP, and medicines</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-silver/70" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 id="features-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              What stays in the folder
            </h2>
            <p className="mt-2 max-w-2xl text-blue-slate">
              Built for families who already keep reports in WhatsApp, Drive, or a drawer, and need one place that is actually theirs.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="rounded-2xl border border-silver bg-white p-6">
                  <h3 className="font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-slate">{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-silver/70 bg-background" aria-labelledby="steps-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 id="steps-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step} className="rounded-2xl border border-silver bg-white p-6">
                  <p className="text-sm font-semibold text-coral">Step {item.step}</p>
                  <h3 className="mt-2 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-slate">{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-silver/70" aria-labelledby="beta-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="rounded-2xl border border-silver bg-background px-6 py-8 sm:px-10">
              <h2 id="beta-heading" className="text-xl font-bold tracking-tight">
                Honest about the beta
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-slate">
                {BETA_ACKNOWLEDGEMENT_TEXT} SanoVault does not give medical advice. The product is free during the beta; AI extraction and summaries may become paid later.
              </p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/privacy" className="text-sm font-medium text-coral hover:underline">
                  How records are handled
                </Link>
                <Link href="/pricing" className="text-sm font-medium text-coral hover:underline">
                  Pricing
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-silver/70 bg-ink text-white" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 id="cta-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Put the family folder in one place
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-silver sm:text-base">
              Create a SanoVault folder, add the people you care for, and stop hunting for last month&apos;s report.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="sv-btn sv-btn-primary">
                Get started
              </Link>
              <Link href="/auth/signin" className="sv-btn !border !border-silver/40 !bg-transparent !text-white hover:!bg-white/10">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-silver/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-blue-slate sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {SITE_NAME}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/auth/signin" className="hover:text-ink">Sign in</Link>
            <Link href="/auth/signup" className="hover:text-ink">Get started</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
