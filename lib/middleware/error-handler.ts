import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown,
    public headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      { status: error.statusCode, headers: error.headers }
    );
  }

  if (error instanceof Error) {
    const errorId = crypto.randomUUID();

    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled error:', error);
    } else {
      // Do not log raw errors in production: database, storage, and AI
      // provider errors can contain query fragments, object keys, or PHI.
      console.error('Unhandled server error', { errorId, errorType: error.name || 'Error' });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId: process.env.NODE_ENV === 'development' ? undefined : errorId,
      },
      { status: 500 }
    );
  }

  const errorId = crypto.randomUUID();
  console.error('Unhandled server error', { errorId, errorType: typeof error });
  return NextResponse.json(
    {
      error: 'Unknown error occurred',
      requestId: process.env.NODE_ENV === 'development' ? undefined : errorId,
    },
    { status: 500 }
  );
}
