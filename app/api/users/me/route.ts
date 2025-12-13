import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  suffix: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  mobileNumbers: z.array(z.object({
    countryCode: z.string(),
    number: z.string(),
  })).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(session.user.id),
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      ...userWithoutPassword,
      id: user._id.toString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const updateData = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData },
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

