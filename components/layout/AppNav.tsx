'use client';

import { Button } from '@heroui/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut, useSession } from '@/lib/auth/client';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useToast } from '@/components/ui/ToastProvider';

type AppNavProps = {
  links?: Array<{ href: string; label: string }>;
  userLabel?: string;
};

const defaultLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/patients', label: 'Family' },
  { href: '/health-records', label: 'Reports' },
  { href: '/medications', label: 'Medicines' },
  { href: '/households', label: 'Who Can See This' },
];

const bottomLinks = [
  { href: '/health-records/new', label: 'Add', match: '/health-records/new' },
  { href: '/dashboard', label: 'Home', match: '/dashboard' },
  { href: '/for-the-doctor', label: 'For the Doctor', match: '/for-the-doctor' },
] as const;

export default function AppNav({ links = defaultLinks, userLabel }: AppNavProps) {
  if (userLabel !== undefined) {
    return <AppNavView links={links} userLabel={userLabel} />;
  }
  return <AppNavFromSession links={links} />;
}

function AppNavFromSession({ links }: { links: Array<{ href: string; label: string }> }) {
  const { data: session } = useSession();
  return <AppNavView links={links} userLabel={session?.user?.email || session?.user?.name || ''} />;
}

function AppNavView({
  links,
  userLabel,
}: {
  links: Array<{ href: string; label: string }>;
  userLabel: string;
}) {
  const { notify } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { householdId, households, loading, setActive } = useHouseholdContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const onSwitch = async (value: string) => {
    setMobileMenuOpen(false);
    if (!value) {
      router.push('/households');
      return;
    }
    try {
      await setActive(value);
      router.refresh();
      if (pathname.startsWith('/patients') || pathname.startsWith('/health-records') || pathname.startsWith('/reports')) {
        window.location.reload();
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to switch household', 'error');
    }
  };

  return (
    <>
      <nav className="border-b border-gray-200 bg-white shadow-sm print:hidden" aria-label="Primary navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <Link href="/dashboard" prefetch={false} className="flex items-center space-x-3 shrink-0">
                <Image src="/logo.png" alt="SanoVault Logo" width={40} height={40} className="rounded-full" />
                <span className="text-xl font-bold text-ink">SanoVault</span>
              </Link>
              <div className="hidden xl:flex items-center space-x-1 ml-4">
                {links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        active ? 'text-coral bg-coral/10' : 'text-blue-slate hover:text-coral'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden xl:flex items-center space-x-3 min-w-0">
              {households.length === 0 && !loading ? (
                <Link href="/households" prefetch={false} className="rounded-lg border border-silver px-3 py-2 text-sm font-medium text-coral hover:bg-coral/10">Who Can See This</Link>
              ) : (
                <>
                  <label className="sr-only" htmlFor="household-switcher">Active household</label>
                  <select
                    id="household-switcher"
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5 max-w-[10rem] sm:max-w-[14rem] bg-white text-gray-900"
                    disabled={loading}
                    value={householdId || ''}
                    onChange={(e) => void onSwitch(e.target.value)}
                  >
                    {loading && <option value="">Loading households…</option>}
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </>
              )}
              <span className="text-sm text-gray-700 truncate hidden sm:inline max-w-[10rem]">
                {userLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                Sign Out
              </Button>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-silver text-ink transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 xl:hidden"
              aria-controls="mobile-navigation"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close more menu' : 'Open more menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="border-t border-gray-200 bg-white xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:px-8">
              <div className="space-y-1">
                {links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-lg px-3 py-3 text-base font-medium ${
                        active
                          ? 'bg-coral/10 text-coral'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-coral'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="mobile-household-switcher">
                    Family folder
                  </label>
                  <select
                    id="mobile-household-switcher"
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
                    disabled={loading}
                    value={householdId || ''}
                    onChange={(e) => void onSwitch(e.target.value)}
                  >
                    {loading && <option value="">Loading…</option>}
                    {!loading && households.length === 0 && <option value="">No folder selected</option>}
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  {households.length === 0 ? (
                    <Link
                      href="/households"
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-2 inline-block min-h-11 py-2 text-sm font-medium text-coral hover:underline"
                    >
                      Who Can See This
                    </Link>
                  ) : null}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="truncate text-sm text-gray-600">
                    {userLabel || 'Signed in'}
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] print:hidden xl:hidden"
        aria-label="Main actions"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-3">
          {bottomLinks.map((link) => {
            const active = pathname === link.match || pathname.startsWith(`${link.match}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center px-2 text-sm font-medium ${
                    active ? 'text-coral' : 'text-blue-slate'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="h-16 xl:hidden print:hidden" aria-hidden="true" />
    </>
  );
}
