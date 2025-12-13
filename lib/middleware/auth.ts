import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/config';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return session;
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

