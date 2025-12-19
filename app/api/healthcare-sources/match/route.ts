import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { findSourceByName, createSource } from '@/lib/services/source.service';

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

    // Try to find matching source
    let source = await findSourceByName(name);
    
    // If not found, create a new one
    if (!source) {
      source = await createSource(name);
    }

    return NextResponse.json({ 
      matched: source.preferredName,
      source 
    });
  } catch (error) {
    return handleError(error);
  }
}

