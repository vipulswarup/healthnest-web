'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'This reset link is missing or invalid. Request a new one.');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authClient.resetPassword({ newPassword: password, token, fetchOptions: { throw: true } });
      router.push(`/auth/signin?${new URLSearchParams({ callbackUrl, message: 'Password updated. Sign in with your new password.' })}`);
    } catch {
      setError('This reset link is invalid or has expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="reset-password-title">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SanoVault Logo" width={48} height={48} className="rounded-full" priority />
          <span className="text-2xl font-bold text-gray-950">SanoVault</span>
        </div>
        <h1 id="reset-password-title" className="mt-8 text-2xl font-bold text-gray-950">Choose a new password</h1>
        <p className="mt-2 text-sm text-gray-600">Use at least 8 characters and avoid reusing an old password.</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New password</label>
            <div className="relative">
              <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-16 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 mt-1.5 px-3 text-sm font-medium text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <input id="confirm-new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30" />
          </div>
          <button type="submit" disabled={loading || !token} className="w-full rounded-lg bg-coral px-4 py-3 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50">{loading ? 'Updating password…' : 'Update password'}</button>
          {!token && <Link href={`/auth/forgot-password?${new URLSearchParams({ callbackUrl })}`} className="block text-center text-sm font-medium text-coral hover:underline">Request a new reset link</Link>}
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center text-gray-600" role="status">Loading…</div>}><ResetPasswordContent /></Suspense>;
}
