import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/patients',
        '/health-records',
        '/medications',
        '/documents',
        '/reports',
        '/households',
        '/bp',
        '/growth',
        '/vaccinations',
        '/visit-notes',
        '/for-the-doctor',
        '/beta-acknowledgement',
        '/auth/',
        '/share/',
        '/care/',
        '/care-shares',
        '/settings',
      ],
    },
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
  };
}
