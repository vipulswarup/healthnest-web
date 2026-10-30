import type { FaqItem } from '@/lib/seo';

export function FaqSection({
  heading = 'Questions people ask',
  items,
}: {
  heading?: string;
  items: FaqItem[];
}) {
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-8 space-y-8">
        {items.map((item) => (
          <div key={item.question}>
            <h3 className="text-lg font-semibold text-ink">{item.question}</h3>
            <p className="mt-2 text-base leading-7 text-blue-slate">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
