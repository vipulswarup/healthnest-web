import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BETA_ACKNOWLEDGEMENT_TEXT,
  BETA_ACKNOWLEDGEMENT_VERSION,
} from '../../lib/legal/beta-acknowledgement';

test('beta acknowledgement identifies the operator, authority and medical limitations', () => {
  assert.match(BETA_ACKNOWLEDGEMENT_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /beta/i);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /Argali Knowledge Services/);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /authorised/);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /original/);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /clinician/);
  assert.match(BETA_ACKNOWLEDGEMENT_TEXT, /privacy policy/);
});
