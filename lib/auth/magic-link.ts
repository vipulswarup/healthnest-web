import { authClient } from '@/lib/auth/client';

type MagicLinkApi = {
  magicLink: (args: {
    email: string;
    callbackURL?: string;
    newUserCallbackURL?: string;
    errorCallbackURL?: string;
  }) => Promise<{ error?: { message?: string } | null }>;
};

function resolveCallbackURL(callbackURL: string) {
  if (callbackURL.startsWith('http://') || callbackURL.startsWith('https://')) {
    return callbackURL;
  }
  if (typeof window !== 'undefined') {
    return new URL(callbackURL, window.location.origin).toString();
  }
  return callbackURL;
}

export async function sendMagicLink(email: string, callbackURL = '/dashboard') {
  const signIn = authClient.signIn as typeof authClient.signIn & MagicLinkApi;
  if (typeof signIn.magicLink !== 'function') {
    return { error: { message: 'Email sign-in links are not enabled yet. Use Google or a password, or ask a family member for help.' } };
  }

  const resolvedCallbackURL = resolveCallbackURL(callbackURL);
  return signIn.magicLink({
    email,
    callbackURL: resolvedCallbackURL,
    newUserCallbackURL: resolvedCallbackURL,
    errorCallbackURL: resolveCallbackURL('/auth/signin?error=magic_link'),
  });
}
