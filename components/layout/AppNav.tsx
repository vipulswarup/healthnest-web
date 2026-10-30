"use client";

import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/auth/client";
import { useHouseholdContext } from "@/components/households/useHouseholdContext";
import { useToast } from "@/components/ui/ToastProvider";

type NavLink = { href: string; label: string };

type AppNavProps = {
  links?: NavLink[];
  userLabel?: string;
};

const primaryLinks: NavLink[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/health-records", label: "Reports" },
  { href: "/visit-notes", label: "Symptoms" },
  { href: "/bp", label: "BP" },
  { href: "/medications", label: "Medicines" },
  { href: "/patients", label: "Family" },
  { href: "/for-the-doctor", label: "Doctor packet" },
];

const moreLinks: NavLink[] = [
  { href: "/care-shares", label: "Share with a doctor" },
  { href: "/households", label: "Who Can See This" },
  { href: "/privacy", label: "Privacy" },
  { href: "/settings/ai", label: "AI processing settings" },
  { href: "/settings/developer", label: "API access" },
  { href: "/delete-account", label: "Delete account" },
];

const defaultLinks = [...primaryLinks, ...moreLinks];

const bottomLinks = [
  { href: "/dashboard", label: "Home", match: "/dashboard" },
  { href: "/health-records", label: "Reports", match: "/health-records" },
  { href: "/visit-notes", label: "Log", match: "/visit-notes" },
  { href: "/medications", label: "Medicines", match: "/medications" },
] as const;

export default function AppNav({
  links = defaultLinks,
  userLabel,
}: AppNavProps) {
  if (userLabel !== undefined) {
    return <AppNavView links={links} userLabel={userLabel} />;
  }
  return <AppNavFromSession links={links} />;
}

function AppNavFromSession({
  links,
}: {
  links: NavLink[];
}) {
  const { data: session } = useSession();
  return (
    <AppNavView
      links={links}
      userLabel={session?.user?.email || session?.user?.name || ""}
    />
  );
}

function splitLinks(links: NavLink[]) {
  if (links !== defaultLinks && links.length) {
    const moreHrefs = new Set(moreLinks.map((link) => link.href));
    return {
      primary: links.filter((link) => !moreHrefs.has(link.href)),
      more: links.filter((link) => moreHrefs.has(link.href)),
    };
  }
  return { primary: primaryLinks, more: moreLinks };
}

function AppNavView({
  links,
  userLabel,
}: {
  links: NavLink[];
  userLabel: string;
}) {
  const { notify } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { householdId, households, loading, setActive } = useHouseholdContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { primary, more } = splitLinks(links);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const moreActive = more.some((link) => isActive(link.href));

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const onSwitch = async (value: string) => {
    setMobileMenuOpen(false);
    if (!value) {
      router.push("/households");
      return;
    }
    try {
      await setActive(value);
      router.refresh();
      if (
        pathname.startsWith("/patients") ||
        pathname.startsWith("/health-records") ||
        pathname.startsWith("/reports")
      ) {
        window.location.reload();
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Failed to switch household",
        "error",
      );
    }
  };

  return (
    <>
      <nav
        className="border-b border-silver bg-white shadow-sm print:hidden"
        aria-label="Primary navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link
                href="/dashboard"
                prefetch={false}
                className="flex shrink-0 items-center space-x-3"
              >
                <Image
                  src="/logo.png"
                  alt="SanoVault Logo"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="text-xl font-bold text-ink">SanoVault</span>
              </Link>
              <div className="hidden min-w-0 items-center gap-0.5 xl:flex">
                {primary.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium ${
                        active
                          ? "bg-sage/25 text-ink"
                          : "text-slate hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {more.length > 0 ? (
                  <div className="relative" ref={moreRef}>
                    <button
                      type="button"
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium ${
                        moreActive || moreOpen
                          ? "bg-sage/25 text-ink"
                          : "text-slate hover:text-ink"
                      }`}
                      aria-expanded={moreOpen}
                      aria-haspopup="menu"
                      onClick={() => setMoreOpen((open) => !open)}
                    >
                      More
                    </button>
                    {moreOpen ? (
                      <div
                        role="menu"
                        className="absolute left-0 z-40 mt-1 min-w-[14rem] rounded-xl border border-silver bg-white py-1 shadow-lg"
                      >
                        {more.map((link) => {
                          const active = isActive(link.href);
                          return (
                            <Link
                              key={link.href}
                              role="menuitem"
                              href={link.href}
                              prefetch={false}
                              aria-current={active ? "page" : undefined}
                              onClick={() => setMoreOpen(false)}
                              className={`block whitespace-nowrap px-4 py-2.5 text-sm ${
                                active
                                  ? "bg-sage/20 font-medium text-ink"
                                  : "text-slate hover:bg-cream hover:text-ink"
                              }`}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-3 xl:flex">
              {households.length === 0 && !loading ? (
                <Link
                  href="/households"
                  prefetch={false}
                  className="whitespace-nowrap rounded-lg border border-sage px-3 py-2 text-sm font-medium text-ink hover:bg-sage/15"
                >
                  Who Can See This
                </Link>
              ) : (
                <>
                  <label className="sr-only" htmlFor="household-switcher">
                    Active household
                  </label>
                  <select
                    id="household-switcher"
                    className="max-w-[12rem] rounded-md border border-silver bg-white px-2 py-1.5 text-sm text-ink"
                    disabled={loading}
                    value={householdId || ""}
                    onChange={(e) => void onSwitch(e.target.value)}
                  >
                    {loading && <option value="">Loading households…</option>}
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onPress={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                Sign Out
              </Button>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-silver text-ink transition-colors hover:bg-cream focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 xl:hidden"
              aria-controls="mobile-navigation"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close more menu" : "Open more menu"}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-silver bg-white xl:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:px-8">
              <div className="space-y-1">
                {links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-lg px-3 py-3 text-base font-medium ${
                        active
                          ? "bg-sage/20 text-ink"
                          : "text-slate hover:bg-cream hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-4 border-t border-silver pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <div>
                  <label
                    className="block text-sm font-medium text-slate"
                    htmlFor="mobile-household-switcher"
                  >
                    Family folder
                  </label>
                  <select
                    id="mobile-household-switcher"
                    className="mt-2 w-full rounded-lg border border-silver bg-white px-3 py-2.5 text-sm text-ink"
                    disabled={loading}
                    value={householdId || ""}
                    onChange={(e) => void onSwitch(e.target.value)}
                  >
                    {loading && <option value="">Loading…</option>}
                    {!loading && households.length === 0 && (
                      <option value="">No folder selected</option>
                    )}
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  {households.length === 0 ? (
                    <Link
                      href="/households"
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-2 inline-block min-h-11 py-2 text-sm font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
                    >
                      Who Can See This
                    </Link>
                  ) : null}
                </div>

                <div className="border-t border-silver pt-4">
                  <p className="truncate text-sm text-slate">
                    {userLabel || "Signed in"}
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="mt-3 w-full rounded-lg border border-silver px-4 py-2.5 text-left text-sm font-medium text-slate hover:bg-cream"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-silver bg-white pb-[env(safe-area-inset-bottom)] print:hidden xl:hidden"
        aria-label="Main actions"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {bottomLinks.map((link) => {
            const active =
              pathname === link.match || pathname.startsWith(`${link.match}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center px-2 text-sm font-medium ${
                    active ? "text-brand-strong font-semibold" : "text-slate"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="h-16 print:hidden xl:hidden" aria-hidden="true" />
    </>
  );
}
