import assert from 'node:assert/strict';
import test from 'node:test';
import { handleError } from '../../lib/middleware/error-handler';

test('production responses redact unexpected error details', async () => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'production', configurable: true, writable: true, enumerable: true,
  });
  console.error = (...args: unknown[]) => logged.push(args);

  try {
    const response = handleError(new Error('database query failed for private record'));
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.error, 'Internal server error');
    assert.equal(typeof body.requestId, 'string');
    assert.equal(JSON.stringify(body).includes('private record'), false);
    assert.equal(JSON.stringify(logged).includes('private record'), false);
  } finally {
    if (originalEnvironment === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnvironment, configurable: true, writable: true, enumerable: true,
      });
    }
    console.error = originalConsoleError;
  }
});
