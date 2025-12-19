import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const db = await getDatabase();
    const categoriesCollection = db.collection('health_record_categories');

    const categories = await categoriesCollection
      .find({ isActive: true })
      .sort({ displayName: 1 })
      .toArray();

    return NextResponse.json(
      categories.map((category) => ({
        ...category,
        id: category._id.toString(),
        _id: category._id.toString(),
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}

