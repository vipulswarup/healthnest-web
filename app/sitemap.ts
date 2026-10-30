import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-09-19');
  return [
    {
      url: CANONICAL_SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${CANONICAL_SITE_URL}/personal-health-record-app-india`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_SITE_URL}/family-health-records`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${CANONICAL_SITE_URL}/guides/how-to-organize-medical-records`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${CANONICAL_SITE_URL}/privacy`,
      lastModified: new Date('2026-09-14'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${CANONICAL_SITE_URL}/pricing`,
      lastModified: new Date('2026-09-14'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
