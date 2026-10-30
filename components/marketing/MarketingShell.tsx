import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-silver/70 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="SanoVault"
                width={40}
                height={40}
                className="rounded-full"
                priority
              />
              <span className="text-lg font-bold tracking-tight">
                {SITE_NAME}
              </span>
            </Link>
            <nav
              className="hidden items-center gap-1 lg:flex"
              aria-label="Topics"
            >
              <Link
                href="/personal-health-record-app-india"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-white hover:text-ink"
              >
                Personal health record
              </Link>
              <Link
                href="/family-health-records"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-white hover:text-ink"
              >
                Family records
              </Link>
              <Link
                href="/guides/how-to-organize-medical-records"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-white hover:text-ink"
              >
                Organise records
              </Link>
            </nav>
          </div>
          <nav
            className="flex items-center gap-1 sm:gap-2"
            aria-label="Account"
          >
            <Link
              href="/pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-white hover:text-ink sm:inline"
            >
              Pricing
            </Link>
            <Link
              href="/auth/signin"
              className="px-3 py-2 text-sm font-medium text-blue-slate hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="sv-btn sv-btn-primary !min-h-10 !px-4 !text-sm"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-silver/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-blue-slate sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link
              href="/personal-health-record-app-india"
              className="hover:text-ink"
            >
              Personal health record
            </Link>
            <Link href="/family-health-records" className="hover:text-ink">
              Family health records
            </Link>
            <Link
              href="/guides/how-to-organize-medical-records"
              className="hover:text-ink"
            >
              How to organise medical records
            </Link>
            <Link href="/pricing" className="hover:text-ink">
              Pricing
            </Link>
            <Link href="/delete-account" className="hover:underline">Delete account</Link>
          <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/auth/signin" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/auth/signup" className="hover:text-ink">
              Get started
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function MarketingCta({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <section
      className="border-t border-silver/70 bg-ink text-white"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="cta-heading"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-silver sm:text-base">
          {body}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="sv-btn sv-btn-primary !bg-cream !text-ink hover:!bg-white"
          >
            Get started
          </Link>
          <Link
            href="/auth/signin"
            className="sv-btn !border !border-silver/40 !bg-transparent !text-white hover:!bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
