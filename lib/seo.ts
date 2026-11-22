import type { Metadata } from 'next';
import { CANONICAL_SITE_URL } from '@/lib/site';

export type FaqItem = {
  question: string;
  answer: string;
};

export type BreadcrumbItem = {
  name: string;
  path: string;
};

// Page-level openGraph/twitter objects replace the root ones in Next.js, so the
// default share image is re-declared here for every public page.
export const OG_IMAGE_URL = `${CANONICAL_SITE_URL}/opengraph-image.png`;
const OG_IMAGE = { url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'SanoVault — all your family\'s medical records in one place' };

export const ORGANIZATION_ID = `${CANONICAL_SITE_URL}/#organization`;
export const ARGALI_ID = `${CANONICAL_SITE_URL}/#argali`;

export function publicPageMetadata({
  title,
  description,
  path,
  type = 'website',
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      type,
      locale: 'en_IN',
      siteName: 'SanoVault',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE_URL],
    },
  };
}

export type ArticleInput = {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
};

export const AUTHOR_NAME = 'Vipul Swarup';
export const AUTHOR_URL = 'https://www.linkedin.com/in/vipulswarup';

export function articleJsonLd({ headline, description, path, datePublished, dateModified }: ArticleInput) {
  const url = `${CANONICAL_SITE_URL}${path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: [OG_IMAGE_URL],
    datePublished,
    dateModified,
    inLanguage: 'en-IN',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL, sameAs: [AUTHOR_URL] },
    publisher: {
      '@type': 'Organization',
      '@id': ARGALI_ID,
      name: 'Argali Knowledge Services Private Limited',
      url: 'https://www.eisenvault.com/',
      logo: { '@type': 'ImageObject', url: `${CANONICAL_SITE_URL}/logo.png` },
    },
  };
}

export function faqJsonLd(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path === '/' ? CANONICAL_SITE_URL : `${CANONICAL_SITE_URL}${item.path}`,
    })),
  };
}
