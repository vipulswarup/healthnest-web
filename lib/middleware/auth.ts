import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function requireAuth(_request: NextRequest) {
  void _request;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.name.split(/\s+/)[0] || 'User',
    },
  };
}

export async function getUserId(_request: NextRequest): Promise<string | null> {
  void _request;
  const user = await getCurrentUser();
  return user?.id || null;
}
