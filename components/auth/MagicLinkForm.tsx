'use client';

import { FormEvent, useState } from 'react';
import { sendMagicLink } from '@/lib/auth/magic-link';
import { familyReentryMessage, whatsappShareHref } from '@/lib/share/whatsapp';

type MagicLinkFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  callbackURL: string;
  disabled?: boolean;
  onError: (message: string) => void;
};

export default function MagicLinkForm({
  email,
  onEmailChange,
  callbackURL,
  disabled = false,
  onError,
}: MagicLinkFormProps) {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    onError('');
    try {
      const result = await sendMagicLink(email.trim().toLowerCase(), callbackURL);
      if (result?.error) {
        onError(result.error.message || 'We could not send a sign-in link. Try Google or a password.');
        return;
      }
      setSentTo(email.trim().toLowerCase());
    } catch {
      onError('We could not send a sign-in link. Try Google or a password.');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sanovault.com';
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="text-sm font-medium text-emerald-950">A sign-in link is on its way to {sentTo}.</p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Open that email on this phone. You can forward it to WhatsApp if that is easier to find later.
        </p>
        <a
          href={whatsappShareHref(familyReentryMessage(origin))}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-coral hover:underline"
        >
          Send SanoVault on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <label htmlFor="magic-link-email" className="block text-sm font-medium text-gray-700">
        Email Me a Sign-In Link
      </label>
      <input
        id="magic-link-email"
        type="email"
        autoComplete="email"
        required
        disabled={disabled || loading}
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="you@example.com"
        className="block w-full rounded-lg border border-gray-300 px-3.5 py-3 text-gray-900 placeholder-gray-400 focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/30"
      />
      <button
        type="submit"
        disabled={disabled || loading}
        className="sv-btn sv-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Sending Link…' : 'Email Me a Sign-In Link'}
      </button>
    </form>
  );
}
