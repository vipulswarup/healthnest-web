import Link from 'next/link';
import type { BreadcrumbItem } from '@/lib/seo';

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-blue-slate">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {last ? (
                <span className="text-ink">{item.name}</span>
              ) : (
                <Link href={item.path} className="hover:text-ink">{item.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
