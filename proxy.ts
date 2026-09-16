import { auth } from '@/lib/auth/server';
import { hasTrustedMutationOrigin } from '@/lib/security/csrf';
import { NextRequest, NextResponse } from 'next/server';

const protectedPageMiddleware = auth.middleware({ loginUrl: '/auth/signin' });

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const isAuthRoute = pathname.startsWith('/api/auth/');
    const isWebhook = pathname.startsWith('/api/webhooks/');

    if (isUnsafeMethod && !isAuthRoute && !isWebhook) {
      const hasBearer = (request.headers.get('authorization') || '').toLowerCase().startsWith('bearer ');
      if (!hasBearer && !hasTrustedMutationOrigin({
        origin: request.headers.get('origin'),
        requestOrigin: request.nextUrl.origin,
        configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      })) {
        return NextResponse.json(
          { error: 'Invalid request origin', code: 'CSRF_VALIDATION_FAILED' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.next();
  }

  return protectedPageMiddleware(request);
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/patients',
    '/patients/:path*',
    '/health-records',
    '/health-records/:path*',
    '/medications',
    '/medications/:path*',
    '/documents',
    '/documents/:path*',
    '/reports',
    '/reports/:path*',
    '/for-the-doctor',
    '/beta-acknowledgement',
    '/households',
    // Allow /households/invites/:token without auth so invitees see a pending-invite gate.
    '/households/((?!invites(?:/|$)).*)',
    '/api/:path*',
  ],
};
