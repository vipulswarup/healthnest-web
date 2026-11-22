import { MARKETING_ROUTES } from '@/lib/marketing-routes';
import { CANONICAL_SITE_URL } from '@/lib/site';

// Serves the same URL list as /sitemap.xml directly (no redirect), because
// /sites.xml was already submitted to Search Console and crawlers handle a
// direct 200 more reliably than a redirected sitemap.
export const dynamic = 'force-static';

export function GET() {
  const urls = MARKETING_ROUTES.map((route) => {
    const loc = route.path === '/' ? CANONICAL_SITE_URL : `${CANONICAL_SITE_URL}${route.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${route.lastModified}</lastmod>\n    <changefreq>${route.changeFrequency}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
