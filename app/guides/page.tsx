import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { GUIDES, PRODUCT_PAGES } from '@/lib/guides';
import { breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';
import { CANONICAL_SITE_URL } from '@/lib/site';

const TITLE = 'Guides to Organising Health Records | SanoVault';
const DESCRIPTION =
  'Plain-language guides to organising family medical records, scanning old reports, caring for ageing parents and storing health files safely.';
const PATH = '/guides';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Guides', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Are these guides medical advice?',
    answer: 'No. They are general information about organising and storing your own medical papers. They are not medical or legal advice. Ask your doctor about your health.',
  },
  {
    question: 'Does SanoVault automatically retrieve records?',
    answer: 'No. You upload or scan the records you have. SanoVault does not currently retrieve records from hospital or lab systems.',
  },
  {
    question: 'Is SanoVault free?',
    answer: 'SanoVault is free to use during the beta. AI extraction and summaries may become paid later; see the pricing page.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Guides to keeping family health records',
  description: DESCRIPTION,
  url: `${CANONICAL_SITE_URL}${PATH}`,
  inLanguage: 'en',
  isPartOf: { '@type': 'WebSite', name: 'SanoVault', url: CANONICAL_SITE_URL },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: GUIDES.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.title,
      url: `${CANONICAL_SITE_URL}${g.href}`,
    })),
  },
};

function CardList({ items }: { items: typeof GUIDES }) {
  return (
    <ul className="mt-6 grid gap-6 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="block h-full rounded-2xl border border-silver bg-white p-6 hover:border-sage">
            <h3 className="font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-blue-slate">{item.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function GuidesHubPage() {
  return (
    <MarketingShell>
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Guides to keeping family health records
          </h1>
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            These are plain-language guides for families who want to organise their own medical records. They explain what to keep, how to scan old papers and how to store files safely. They are not medical advice. SanoVault is a personal health record folder for records you add yourself.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">All guides</h2>
          <CardList items={GUIDES} />

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Product pages</h2>
          <CardList items={PRODUCT_PAGES} />
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <Link href="/pricing" className="text-coral hover:underline">Pricing</Link>
            <Link href="/about" className="text-coral hover:underline">About</Link>
            <Link href="/privacy" className="text-coral hover:underline">Privacy</Link>
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>

          <p className="mt-12 text-sm leading-6 text-blue-slate">
            These guides are general information, not medical or legal advice.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
