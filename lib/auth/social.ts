import { authClient } from '@/lib/auth/client';

function resolveCallbackURL(callbackURL: string) {
  if (callbackURL.startsWith('http://') || callbackURL.startsWith('https://')) {
    return callbackURL;
  }
  if (typeof window !== 'undefined') {
    return new URL(callbackURL, window.location.origin).toString();
  }
  return callbackURL;
}

export async function signInWithGoogle(callbackURL = '/dashboard') {
  const resolvedCallbackURL = resolveCallbackURL(callbackURL);
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: resolvedCallbackURL,
    newUserCallbackURL: resolvedCallbackURL,
    errorCallbackURL: resolveCallbackURL('/auth/signin?error=oauth_google'),
  });

  const redirectUrl =
    result && typeof result === 'object' && 'data' in result
      ? (result.data as { url?: string; redirect?: boolean } | null)?.url
      : undefined;
  if (redirectUrl && typeof window !== 'undefined') {
    window.location.assign(redirectUrl);
  }

  return result;
}
