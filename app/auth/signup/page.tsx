'use client';

import { authClient } from '@/lib/auth/client';
import MagicLinkForm from '@/components/auth/MagicLinkForm';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const emailFromInvite = searchParams.get('email')?.trim().toLowerCase() || '';
  const betaAcknowledgementUrl = `/beta-acknowledgement?${new URLSearchParams({ callbackUrl })}`;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(emailFromInvite);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (emailFromInvite) setEmail(emailFromInvite);
  }, [emailFromInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name: [firstName, lastName].filter(Boolean).join(' '),
        email: email.trim().toLowerCase(),
        password,
        callbackURL: callbackUrl,
      });

      if (result?.error) {
        setError(result.error.message || 'Unable to create account. Please try again.');
        return;
      }

      router.push(betaAcknowledgementUrl);
      router.refresh();
    } catch {
      setError('Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signInHref = (() => {
    const qs = new URLSearchParams({ callbackUrl });
    if (email.trim()) qs.set('email', email.trim().toLowerCase());
    return `/auth/signin?${qs.toString()}`;
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 border border-gray-200 bg-white rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="SanoVault Logo"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {emailFromInvite
              ? 'Finish signing up to accept your household invite'
              : 'Use Google, an email sign-in link, or a password.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <SocialAuthButtons
          mode="signup"
          callbackURL={betaAcknowledgementUrl}
          disabled={loading}
          onError={setError}
        />

        <MagicLinkForm
          email={email}
          onEmailChange={setEmail}
          callbackURL={betaAcknowledgementUrl}
          disabled={loading}
          onError={setError}
        />

        {showPasswordForm ? (
        <form className="space-y-6 border-t border-gray-200 pt-6" onSubmit={handleSubmit}>
          <p className="text-sm font-medium text-gray-700">Or create an account with a password</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-coral focus:border-coral sm:text-sm"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-coral focus:border-coral sm:text-sm"
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-coral focus:border-coral sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-16 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-coral focus:border-coral sm:text-sm"
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-16 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-coral focus:border-coral sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-gray-600" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-coral hover:bg-coral-strong focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Creating account...' : 'Sign up with password'}
            </button>
          </div>
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

        <div className="text-center">
          <a
            href={signInHref}
            className="font-medium text-coral hover:text-coral-strong transition-colors"
          >
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
