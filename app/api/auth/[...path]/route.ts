import { auth } from '@/lib/auth/server';
import { guardAuthRequest } from '@/lib/security/auth-request';
import { consumeAuthLimit } from '@/lib/security/auth-rate-limit';

const handlers = auth.handler();
export const { GET, PUT, PATCH, DELETE } = handlers;

export async function POST(...args: Parameters<typeof handlers.POST>) {
  const rejection = await guardAuthRequest(args[0], consumeAuthLimit);
  return rejection ?? handlers.POST(...args);
}
