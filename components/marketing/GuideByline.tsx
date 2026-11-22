import { MARKETING_ROUTES } from '@/lib/marketing-routes';
import { AUTHOR_NAME, AUTHOR_URL } from '@/lib/seo';

// TODO: publish vs modified dates are not tracked separately in the repo; the
// sitemap lastModified value is used for both.
export function guideDates(path: string) {
  const route = MARKETING_ROUTES.find((r) => r.path === path);
  const date = route?.lastModified ?? '2026-09-19';
  return { datePublished: date, dateModified: date };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function GuideByline({ path }: { path: string }) {
  const { dateModified } = guideDates(path);
  return (
    <p className="mt-3 text-sm text-blue-slate">
      By{' '}
      <a href={AUTHOR_URL} rel="author noopener" target="_blank" className="font-medium text-coral hover:underline">
        {AUTHOR_NAME}
      </a>{' '}
      · Updated on <time dateTime={dateModified}>{formatDate(dateModified)}</time>
    </p>
  );
}
