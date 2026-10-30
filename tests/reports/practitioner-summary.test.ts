import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { generatePractitionerSummary, validatePractitionerSummary } from '../../lib/reports/practitioner-summary';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GROQ_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

test('accepts 200 words and rejects excess output without truncating clinical statements', () => {
  assert.equal(validatePractitionerSummary('word '.repeat(200)), 'word '.repeat(200).trim());
  assert.throws(() => validatePractitionerSummary('word '.repeat(201)), /word limit/);
  for (const invalid of ['', '   ', undefined, null, 123]) {
    assert.throws(() => validatePractitionerSummary(invalid), /empty summary/);
  }
});

test('sends report as source data and returns the generated summary with values intact', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  const summary = 'Haemoglobin 9.2 g/dL (reference 12–15 g/dL). The report documents anaemia.';
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    assert.equal(request.messages[1].content, 'Report: Hb 9.2 g/dL');
    assert.match(request.messages[0].content, /at most 200 words/);
    assert.match(request.messages[0].content, /Do not invent diagnoses/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ summary }) } }] });
  };
  assert.equal(await generatePractitionerSummary('Report: Hb 9.2 g/dL'), summary);
});

test('rejects unavailable, malformed and overlong AI responses', async () => {
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(generatePractitionerSummary('Report'));
  for (const content of ['not json', '{}', JSON.stringify({ summary: 'word '.repeat(201) })]) {
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content } }] });
    await assert.rejects(generatePractitionerSummary('Report'));
  }
});

test('does not make provider calls when AI credentials are missing', async () => {
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = async () => { throw new Error('Should not call provider'); };
  await assert.rejects(generatePractitionerSummary('Report'), /AI service unavailable/);
});
