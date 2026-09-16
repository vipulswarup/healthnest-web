import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: CANONICAL_SITE_URL,
      lastModified: new Date('2026-09-14'),
      changeFrequency: 'weekly',
      priority: 1,
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
