'use client';

import { authClient } from '@/lib/auth/client';
import MagicLinkForm from '@/components/auth/MagicLinkForm';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import { familyReentryMessage, whatsappShareHref } from '@/lib/share/whatsapp';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const FEATURES = [
  {
    title: 'Privacy & Security',
    description: 'Your records stay in an encrypted vault you control.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'AI Insights',
    description: 'Get clear summaries and trends from your lab results and records.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: 'Family Profiles',
    description: 'Manage health records for everyone in your family, in one place.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
] as const;

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNative = searchParams.get('native') === '1';
  const callbackUrl = isNative ? '/auth/native-bridge' : (searchParams.get('callbackUrl') || '/dashboard');
  const emailFromInvite = searchParams.get('email')?.trim().toLowerCase() || '';

  const [email, setEmail] = useState(emailFromInvite);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [origin, setOrigin] = useState('https://sanovault.com');

  useEffect(() => {
    setOrigin(window.location.origin);
    if (emailFromInvite) setEmail(emailFromInvite);

    const msg = searchParams.get('message');
    if (msg) setMessage(msg);

    const oauthError = searchParams.get('error');
    if (oauthError === 'magic_link') {
      setError('That sign-in link did not work. Request a new one, or use Google.');
    } else if (oauthError?.startsWith('oauth_')) {
      setError('Social sign-in failed. Ensure this provider is enabled in Neon Auth and try again.');
    }

    authClient.getSession().then(({ data }) => {
      if (data?.user) {
        router.push(callbackUrl);
      } else {
        setIsCheckingSession(false);
      }
    });
  }, [router, callbackUrl, searchParams, emailFromInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL: callbackUrl,
      });

      if (result?.error) {
        setError(result.error.message || 'Invalid email or password');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  const inputClassName =
    'mt-1.5 block w-full rounded-lg border border-silver px-3.5 py-2.5 text-ink placeholder-blue-slate shadow-none focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30 sm:text-sm';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative hidden flex-col justify-center bg-gradient-to-br from-coral/10 via-white to-silver/40 px-6 py-12 sm:px-10 lg:flex lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="SanoVault Logo"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
            <span className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              SanoVault
            </span>
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            One Vault for Your Family&apos;s Health
          </h1>
          <p className="mt-3 text-base text-gray-600 sm:text-lg">
            Store records securely, understand what they mean, and keep everyone&apos;s care in sync.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                  {feature.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="SanoVault Logo" width={48} height={48} className="rounded-full" priority />
            <span className="text-2xl font-bold tracking-tight text-gray-950">SanoVault</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Open SanoVault
            </h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Use Google, or a link emailed to you. You can also use a password if you have one.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {message && (
              <div role="status" className="rounded-lg bg-green-50 px-4 py-3">
                <div className="text-sm text-green-800">{message}</div>
              </div>
            )}
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <SocialAuthButtons
              mode="signin"
              callbackURL={callbackUrl}
              disabled={loading}
              onError={setError}
            />

            <MagicLinkForm
              email={email}
              onEmailChange={setEmail}
              callbackURL={callbackUrl}
              disabled={loading}
              onError={setError}
            />

            <a
              href={whatsappShareHref(familyReentryMessage(origin))}
              className="inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-coral hover:underline"
            >
              Send This Page on WhatsApp
            </a>

            {showPasswordForm ? (
              <form className="space-y-5 border-t border-gray-200 pt-6" onSubmit={handleSubmit}>
                <p className="text-sm font-medium text-gray-700">Or Sign In with a Password</p>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={inputClassName}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <a href={`/auth/forgot-password?${new URLSearchParams({ callbackUrl, email: email.trim().toLowerCase() })}`} className="text-sm font-medium text-coral hover:underline">Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className={`${inputClassName} pr-16`}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute inset-y-0 right-0 mt-1.5 px-3 text-sm font-medium text-gray-600 hover:text-gray-950"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="sv-btn sv-btn-primary w-full"
                >
                  {loading ? 'Signing In...' : 'Sign In with Password'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="w-full text-center text-sm font-medium text-gray-600 hover:text-gray-950"
              >
                Use a Password Instead
              </button>
            )}

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a
                href={(() => {
                  const qs = new URLSearchParams({ callbackUrl });
                  if (email.trim()) qs.set('email', email.trim().toLowerCase());
                  return `/auth/signup?${qs.toString()}`;
                })()}
                className="font-medium text-coral hover:text-coral-strong transition-colors"
              >
                Sign Up
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
