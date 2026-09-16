import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { loadDashboardHome } from '@/lib/dashboard/load-home';
import { AppError, handleError } from '@/lib/middleware/error-handler';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const home = await loadDashboardHome(user.id, user.email);
    return NextResponse.json(home, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleError(error);
  }
}
