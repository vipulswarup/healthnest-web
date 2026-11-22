import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { breadcrumbJsonLd, publicPageMetadata, type BreadcrumbItem } from '@/lib/seo';
import { CANONICAL_SITE_URL } from '@/lib/site';

const TITLE = 'About SanoVault — Built by the EisenVault team';
const DESCRIPTION =
  'SanoVault is built by Argali Knowledge Services Pvt Ltd, the team behind EisenVault. Learn who makes SanoVault and how to contact us.';
const PATH = '/about';
const EISENVAULT_ABOUT_URL = 'https://www.eisenvault.com/about-company';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'About', path: PATH },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About SanoVault',
  url: `${CANONICAL_SITE_URL}${PATH}`,
  mainEntity: {
    '@type': 'Organization',
    name: 'Argali Knowledge Services Pvt Ltd',
    brand: [{ '@type': 'Brand', name: 'SanoVault' }, { '@type': 'Brand', name: 'EisenVault' }],
    url: 'https://www.eisenvault.com/',
  },
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={aboutJsonLd} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-coral">About</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">About SanoVault</h1>
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            SanoVault is a personal health record for families: one place to keep lab reports, prescriptions, scans and medicines from different providers.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Who builds SanoVault</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is built by <strong>Argali Knowledge Services Pvt Ltd</strong>, the team behind{' '}
            <a
              href={EISENVAULT_ABOUT_URL}
              className="font-medium text-coral hover:underline"
              target="_blank"
              rel="noopener"
            >
              EisenVault
            </a>
            , a document management software company. You can read more about the company on{' '}
            <a
              href={EISENVAULT_ABOUT_URL}
              className="font-medium text-coral hover:underline"
              target="_blank"
              rel="noopener"
            >
              EisenVault&apos;s About page
            </a>
            .
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            That background is why SanoVault is built around documents: keeping them organised, findable and under your control.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What SanoVault is, and is not</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>It is a place to keep the records you already have, filed per person in a family folder.</li>
            <li>It does not give medical advice.</li>
            <li>It does not automatically retrieve records from hospital portals; you add the files you have.</li>
            <li>It is in beta and free to use right now. See <Link href="/pricing" className="font-medium text-coral hover:underline">pricing</Link>.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Your records and privacy</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Files you upload are shown to the people in your family folder, and to anyone you create a share link for. SanoVault does not publish a public health profile. Read{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">how records are handled</Link>
            {' '}for the details.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Contact</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            For support or questions about SanoVault, email{' '}
            <a href="mailto:support@eisenvault.com" className="font-medium text-coral hover:underline">
              support@eisenvault.com
            </a>
            . To delete your account, see{' '}
            <Link href="/delete-account" className="font-medium text-coral hover:underline">delete account</Link>.
          </p>
        </article>
      </main>
    </MarketingShell>
  );
}
