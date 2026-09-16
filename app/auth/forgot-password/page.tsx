'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password?${new URLSearchParams({ callbackUrl })}`;
      await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo,
        fetchOptions: { throw: true },
      });
      setSent(true);
    } catch {
      setError('We could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="forgot-password-title">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SanoVault Logo" width={48} height={48} className="rounded-full" priority />
          <span className="text-2xl font-bold text-gray-950">SanoVault</span>
        </div>
        <h1 id="forgot-password-title" className="mt-8 text-2xl font-bold text-gray-950">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Enter your account email and we’ll send a secure reset link.</p>

        {sent ? (
          <div className="mt-6" role="status">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
            </div>
            <Link href={`/auth/signin?${new URLSearchParams({ callbackUrl, email: email.trim().toLowerCase() })}`} className="mt-6 inline-flex text-sm font-medium text-coral hover:underline">← Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-coral px-4 py-3 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50">{loading ? 'Sending link…' : 'Send reset link'}</button>
            <Link href={`/auth/signin?${new URLSearchParams({ callbackUrl, email: email.trim().toLowerCase() })}`} className="block text-center text-sm font-medium text-coral hover:underline">Back to sign in</Link>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-600" role="status">Loading…</div>}><ForgotPasswordContent /></Suspense>;
}
