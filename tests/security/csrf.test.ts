import assert from 'node:assert/strict';
import test from 'node:test';
import { hasTrustedMutationOrigin } from '../../lib/security/csrf';

const production = {
  requestOrigin: 'https://www.sanovault.com',
  configuredAppUrl: 'https://www.sanovault.com',
  nodeEnv: 'production',
};

test('accepts the configured production origin', () => {
  assert.equal(hasTrustedMutationOrigin({ ...production, origin: 'https://www.sanovault.com' }), true);
});

test('accepts only the canonical www/apex alias in production', () => {
  assert.equal(hasTrustedMutationOrigin({
    ...production,
    configuredAppUrl: 'https://sanovault.com',
    origin: 'https://www.sanovault.com',
  }), true);
  assert.equal(hasTrustedMutationOrigin({
    ...production,
    origin: 'https://attacker.sanovault.com',
  }), false);
});

test('rejects missing and cross-site production origins', () => {
  assert.equal(hasTrustedMutationOrigin({ ...production, origin: null }), false);
  assert.equal(hasTrustedMutationOrigin({ ...production, origin: 'https://attacker.example' }), false);
});

test('allows same-origin preview requests but not arbitrary preview origins', () => {
  const preview = {
    requestOrigin: 'https://sanovault-git-main.vercel.app',
    configuredAppUrl: 'https://www.sanovault.com',
    nodeEnv: 'production',
    vercelEnv: 'preview',
  };
  assert.equal(hasTrustedMutationOrigin({ ...preview, origin: preview.requestOrigin }), true);
  assert.equal(hasTrustedMutationOrigin({ ...preview, origin: 'https://attacker.example' }), false);
});
