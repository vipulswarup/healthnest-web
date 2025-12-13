import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { uploadToR2 } from '@/lib/r2';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new AppError('No file provided', 400);
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new AppError(
        'Invalid file type. Allowed: PDF, JPEG, PNG, HEIC, HEIF',
        400
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new AppError('File size exceeds 10MB limit', 400);
    }

    // Check if R2 is configured
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new AppError(
        'File storage is not configured. Please set up Cloudflare R2 credentials in your .env file.',
        503
      );
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop();
    const fileName = `${session.user.id}/${randomUUID()}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Upload to R2
      const url = await uploadToR2(fileName, buffer, file.type);

      return NextResponse.json({
        url,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (r2Error: any) {
      // Provide helpful error message for R2 access issues
      if (r2Error.name === 'AccessDenied' || r2Error.Code === 'AccessDenied') {
        throw new AppError(
          'Access denied to file storage. Please check your R2 credentials and bucket permissions.',
          403
        );
      }
      throw r2Error;
    }
  } catch (error) {
    return handleError(error);
  }
}

