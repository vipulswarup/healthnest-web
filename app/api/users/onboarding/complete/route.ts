import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          onboardingCompleted: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new AppError('User not found', 404);
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = result;

    return NextResponse.json({
      ...userWithoutPassword,
      id: result._id.toString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

