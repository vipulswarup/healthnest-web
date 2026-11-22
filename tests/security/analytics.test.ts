import assert from 'node:assert/strict';
import test from 'node:test';
import { CONSENT_MAX_AGE, parseConsent, publicAnalyticsUrl } from '../../lib/analytics';
const origin = 'https://www.sanovault.com';
test('consent defaults off and expires after six months', () => {
  for (const raw of [null, 'bad', '{}', '{"analytics":true}', JSON.stringify({ analytics: true, savedAt: 200 })]) assert.equal(parseConsent(raw, 100), null);
  assert.equal(parseConsent(JSON.stringify({ analytics: true, savedAt: 100 }), CONSENT_MAX_AGE + 100), null);
  assert.deepEqual(parseConsent('{"analytics":false,"savedAt":100}', 200), { analytics: false, savedAt: 100 });
});
test('only public pages are tracked and all query strings and fragments are removed', () => {
  assert.equal(publicAnalyticsUrl('/?email=private@example.com#secret', origin), origin + '/');
  assert.equal(publicAnalyticsUrl('/guides?search=diagnosis', origin), origin + '/guides');
  for (const path of ['/patients/123', '/share/token', '/care/token', '/auth/signin', '/api/users/me', '/dashboard', '/not-a-page', 'https://other.example/']) assert.equal(publicAnalyticsUrl(path, origin), null);
});
