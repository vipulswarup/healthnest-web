import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAllSources, findSourceByName, createSource } from '@/lib/services/source.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const sources = await getAllSources();
    return NextResponse.json(sources);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      throw new AppError('Source name is required', 400);
    }

    // Check if source already exists
    const existing = await findSourceByName(name);
    if (existing) {
      return NextResponse.json(existing);
    }

    // Create new source
    const newSource = await createSource(name);
    return NextResponse.json(newSource, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

