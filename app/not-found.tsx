import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';

export default function NotFound() {
  return <MarketingShell><main id="main-content" className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
    <p className="text-sm font-semibold text-coral">404 · Page not found</p>
    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Let’s get you back to SanoVault</h1>
    <p className="mt-4 leading-7 text-blue-slate">This address may have changed, or the page may no longer be available. Check the link or return to the home page.</p>
    <Link href="/" className="sv-btn sv-btn-primary mt-8">Go to the home page</Link>
    <p className="mt-5"><Link href="/auth/signin" className="text-coral underline">Sign in to your records</Link></p>
  </main></MarketingShell>;
}
