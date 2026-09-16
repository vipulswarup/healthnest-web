'use client';

import { createAuthClient } from '@neondatabase/auth/next';
import { useMemo } from 'react';

export const authClient = createAuthClient();

export function useSession() {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user?.id;
  const email = data?.user?.email;
  const name = data?.user?.name;

  return useMemo(() => {
    if (!userId || !email) {
      return {
        data: null,
        status: isPending ? 'loading' : 'unauthenticated',
      } as const;
    }

    const fullName = name?.trim() || email || 'User';
    return {
      data: {
        user: {
          id: userId,
          email,
          name: fullName,
          firstName: fullName.split(/\s+/)[0] || 'User',
        },
      },
      status: isPending ? 'loading' : 'authenticated',
    } as const;
  }, [userId, email, name, isPending]);
}

export async function signOut({ callbackUrl }: { callbackUrl?: string } = {}) {
  const result = await authClient.signOut();
  if (callbackUrl) window.location.assign(callbackUrl);
  return result;
}
