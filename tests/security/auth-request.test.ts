import assert from 'node:assert/strict';
import test from 'node:test';
import { guardAuthRequest } from '../../lib/security/auth-request';

const request = (body: unknown, path = 'sign-up/email') => new Request(`https://www.sanovault.com/api/auth/${path}`, { method: 'POST', body: JSON.stringify(body) });
const valid = { name: 'Asha', email: 'asha@example.com', password: 'long-password' };

test('rejects invalid signup fields before contacting the auth provider', async () => {
  for (const body of [{ ...valid, name: '  ' }, { ...valid, email: 'invalid' }, { ...valid, password: 'short' }]) {
    const response = await guardAuthRequest(request(body), async () => { throw new Error('must not consume'); });
    assert.equal(response?.status, 400);
  }
});
test('normalises identities and leaves original request body readable', async () => {
  const req = request({ ...valid, email: 'ASHA@example.com' });
  const keys: string[] = [];
  assert.equal(await guardAuthRequest(req, async key => { keys.push(key); return true; }), null);
  assert.ok(keys.includes('email:asha@example.com'));
  assert.equal((await req.json()).password, valid.password);
});
test('blocks repeated submissions across endpoints and fails closed on storage failure', async () => {
  for (const path of ['sign-up/email', 'sign-in/email', 'sign-in/magic-link', 'request-password-reset', 'mobile/password']) {
    const blocked = await guardAuthRequest(request(valid, path), async () => false);
    assert.equal(blocked?.status, 429);
    assert.equal(blocked?.headers.get('Retry-After'), '3600');
    assert.equal((await guardAuthRequest(request(valid, path), async () => { throw new Error('offline'); }))?.status, 503);
  }
});
test('leaves OAuth, session refresh and unrelated requests to the provider', async () => {
  assert.equal(await guardAuthRequest(request({}, 'sign-in/social'), async () => false), null);
});
test('rejects malformed and oversized bodies', async () => {
  assert.equal((await guardAuthRequest(request({ ...valid, padding: 'x'.repeat(17000) }), async () => true))?.status, 413);
  const malformed = new Request('https://www.sanovault.com/api/auth/sign-in/email', { method: 'POST', body: '{' });
  assert.equal((await guardAuthRequest(malformed, async () => true))?.status, 400);
});
