import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { privacyPolicy } from '@/lib/legal/privacy';
export const metadata: Metadata = { title: 'Privacy Policy', description: 'How SanoVault handles family health records, sharing, service providers and deletion.', alternates: { canonical: '/privacy' } };
export default function PrivacyPage() {
  return <MarketingShell><main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <h1 className="text-3xl font-bold tracking-tight">{privacyPolicy.title}</h1>
    <p className="mt-3 text-sm text-blue-slate">Updated {privacyPolicy.updated} · {privacyPolicy.operator}</p>
    <nav aria-label="Privacy actions" className="mt-6 flex flex-wrap gap-5 text-coral underline">
      <Link href="/delete-account">Delete your account</Link><a href={`mailto:${privacyPolicy.email}`}>Contact privacy support</a>
    </nav>
    {privacyPolicy.sections.map(section => <section key={section.title} className="mt-9">
      <h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-3 text-sm leading-7 text-blue-slate">{section.text}</p>
    </section>)}
    <p className="mt-10"><Link href="/" className="text-coral underline">Back to SanoVault</Link></p>
  </main></MarketingShell>;
}
