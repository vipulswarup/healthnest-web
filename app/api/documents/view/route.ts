import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getR2SignedUrl } from '@/lib/r2';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const body = await request.json();
    const { documentPath } = body;

    if (!documentPath) {
      throw new AppError('Document path is required', 400);
    }

    // Extract the key from the document path
    // The path could be:
    // - Full R2 URL: https://account.r2.cloudflarestorage.com/bucket/key
    // - Public URL: https://public-domain.com/key
    // - Just the key: userId/uuid.ext
    let key: string;
    
    if (documentPath.startsWith('http')) {
      try {
        const url = new URL(documentPath);
        
        // Try to extract from public URL first
        if (process.env.R2_PUBLIC_URL) {
          const publicUrl = new URL(process.env.R2_PUBLIC_URL);
          if (url.hostname === publicUrl.hostname) {
            // Remove the public URL base path
            key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
          } else {
            // Extract from R2 URL format
            // Path format: /bucket/key or just /key
            const pathParts = url.pathname.split('/').filter(p => p);
            if (pathParts.length >= 2 && pathParts[0] === process.env.R2_BUCKET_NAME) {
              // Format: /bucket/key
              key = pathParts.slice(1).join('/');
            } else if (pathParts.length >= 2) {
              // Format: /something/key - assume last two parts are the key (userId/uuid.ext)
              key = pathParts.slice(-2).join('/');
            } else {
              // Fallback: use the entire path
              key = pathParts.join('/');
            }
          }
        } else {
          // No public URL configured, extract from R2 URL
          const pathParts = url.pathname.split('/').filter(p => p);
          if (pathParts.length >= 2 && pathParts[0] === process.env.R2_BUCKET_NAME) {
            key = pathParts.slice(1).join('/');
          } else if (pathParts.length >= 2) {
            key = pathParts.slice(-2).join('/');
          } else {
            key = pathParts.join('/');
          }
        }
      } catch (urlError) {
        // If URL parsing fails, try simple string manipulation
        if (process.env.R2_PUBLIC_URL && documentPath.startsWith(process.env.R2_PUBLIC_URL)) {
          key = documentPath.replace(`${process.env.R2_PUBLIC_URL}/`, '').replace(`${process.env.R2_PUBLIC_URL}`, '');
        } else {
          // Fallback: extract last two path segments
          const parts = documentPath.split('/').filter((p: string) => p);
          key = parts.slice(-2).join('/');
        }
      }
    } else {
      // Already a key
      key = documentPath;
    }

    // Generate presigned URL (valid for 1 hour)
    const signedUrl = await getR2SignedUrl(key, 3600);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    return handleError(error);
  }
}

