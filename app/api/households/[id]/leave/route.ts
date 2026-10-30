import { processDeletionJobs } from '@/lib/services/deletion.service';
import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const id = z.string().uuid().safeParse((await params).id);
    if (!id.success) throw new AppError('Invalid family ID', 400);
    const [result] = await sql`SELECT leave_family(${user.id}, ${id.data}::uuid) AS dissolved`;
    after(() => processDeletionJobs().then(() => undefined));
    return NextResponse.json({ message: 'Left family', dissolved: result.dissolved });
  } catch (error) {
    if (error instanceof Error && error.message.includes('USE_DELETE_FAMILY')) {
      return handleError(new AppError('You are the last member. Use Delete family to review and confirm removal of its patient records.', 409));
    }
    if (error instanceof Error && error.message.includes('FAMILY_NOT_FOUND')) return handleError(new AppError('Family not found', 404));
    return handleError(error);
  }
}
