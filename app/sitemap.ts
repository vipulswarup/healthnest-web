import type { MetadataRoute } from 'next';
import { MARKETING_ROUTES } from '@/lib/marketing-routes';
import { CANONICAL_SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_ROUTES.map((route) => ({
    url: route.path === '/' ? CANONICAL_SITE_URL : `${CANONICAL_SITE_URL}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
