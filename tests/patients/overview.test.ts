import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPatientOverview } from '../../lib/patients/overview';

const patient = { id: 'patient-1', first_name: 'Test', last_name: 'Patient', date_of_birth: '1980-01-01', gender: 'other' };
const report = (id: string, options: Record<string, unknown> = {}) => ({
  id, record_type: 'CONSULTATION_NOTE', source: 'Clinic', document_date: '2026-10-10',
  created_at: '2026-10-12T12:00:00Z', ocr_text: 'Documented hypertension; continuing prescribed medication.', tags: ['hypertension'], data: {}, ...options,
});
const medicine = { id: 'm1', name: 'Example medicine', dosage: '5 mg', frequency: 'daily', start_date: '2026-01-01', end_date: '2026-10-26', is_active: true };
const note = { id: 'n1', note_date: '2026-10-11', observed: 'Reported headache', ask_doctor: 'Discuss symptoms' };

test('reuses the evidence fingerprint across query order, JSON key order, pinning and generated report summaries', () => {
  const initial = buildPatientOverview(patient, [report('a', { data: { b: 2, a: 1 } }), report('b')], [medicine], [note]);
  const unchanged = buildPatientOverview({ ...patient, first_name: 'Changed name', updated_at: 'later' }, [report('b'), report('a', { updated_at: 'later', data: { a: 1, b: 2, practitionerSummary: { text: 'Cached summary' } } })], [{ ...medicine, updated_at: 'later' }], [{ ...note, pinned: true }]);
  assert.equal(initial.sourceHash, unchanged.sourceHash);
});

test('invalidates on additions, deletions, OCR correction, changed lab values, medicine changes and note edits', () => {
  const baseline = buildPatientOverview(patient, [report('a')], [medicine], [note]).sourceHash;
  for (const candidate of [
    buildPatientOverview(patient, [report('a'), report('b')], [medicine], [note]),
    buildPatientOverview(patient, [], [medicine], [note]),
    buildPatientOverview(patient, [report('a', { ocr_text: 'Corrected report' })], [medicine], [note]),
    buildPatientOverview(patient, [report('a', { data: { labResultsManual: true, labResults: [{ metric: 'hemoglobin', value: 9.2 }] } })], [medicine], [note]),
    buildPatientOverview(patient, [report('a')], [{ ...medicine, is_active: false }], [note]),
    buildPatientOverview(patient, [report('a')], [medicine], [{ ...note, observed: 'Headache resolved' }]),
  ]) assert.notEqual(candidate.sourceHash, baseline);
});

test('only passage across a medicine start/end boundary changes current-treatment evidence', () => {
  const build = (day: string) => buildPatientOverview(patient, [], [medicine], [], day);
  assert.equal(build('2026-10-24').sourceHash, build('2026-10-25').sourceHash);
  assert.notEqual(build('2026-10-26').sourceHash, build('2026-10-27').sourceHash);
});

test('excludes unconfirmed imports and identity documents from summary, timeline, labs and tag counts', () => {
  const result = buildPatientOverview(patient, [report('a'), report('pending', { tags: ['needs_review', 'cancer'] }), report('id', { record_type: 'ID_DOCUMENT', tags: ['passport'] })], [], []);
  assert.deepEqual(result.overview.tags.map((tag) => tag.tag), ['hypertension']);
  assert.deepEqual(result.overview.timeline.map((entry) => entry.recordId), ['a']);
  assert.equal(JSON.parse(result.source).records.length, 1);
});

test('tag counts represent distinct linked reports and weight larger collections more heavily', () => {
  const result = buildPatientOverview(patient, [report('a', { tags: ['kidney', 'kidney', 'liver'] }), report('b', { tags: ['kidney'] })], [], []).overview;
  assert.deepEqual(result.tags.map(({ tag, count }) => ({ tag, count })), [{ tag: 'kidney', count: 2 }, { tag: 'liver', count: 1 }]);
  assert.ok(result.tags[0].weight > result.tags[1].weight);
});

test('timeline uses clinical dates, labels upload fallbacks, and does not invent completed treatment dates', () => {
  const timeline = buildPatientOverview(patient, [report('old', { document_date: '2024-01-01', created_at: '2026-10-25' }), report('undated', { document_date: null })], [{ ...medicine, end_date: null, is_active: false }], [note]).overview.timeline;
  assert.equal(timeline.at(-1)?.recordId, 'old');
  assert.equal(timeline.find((entry) => entry.recordId === 'undated')?.dateIsUpload, true);
  assert.equal(timeline.filter((entry) => entry.id.startsWith('end:')).length, 0);
});

const lab = (id: string, date: string, value: number, unit: string | null) => report(id, {
  record_type: 'LAB_REPORT', document_date: date,
  data: { labResultsManual: true, labResults: [{ metric: 'hemoglobin', label: 'Haemoglobin', value, rawValue: String(value), unit, referenceLow: 12, referenceHigh: 15 }] },
});

test('pathology preserves exact units and values and compares latest to previous, not oldest', () => {
  const [entry] = buildPatientOverview(patient, [lab('a', '2026-01-01', 8, 'g/dL'), lab('b', '2026-05-01', 11, 'g/dL'), lab('c', '2026-10-01', 9.2, 'g/dL')], [], []).overview.pathology;
  assert.equal(entry.latest, '9.2 g/dL');
  assert.equal(entry.previous, '11 g/dL');
  assert.equal(entry.trend, 'Decreased');
  assert.equal(entry.status, 'low');
  assert.equal(entry.recordId, 'c');
});

test('changed or missing units do not produce a misleading numeric trend', () => {
  for (const unit of ['g/L', null]) {
    const [entry] = buildPatientOverview(patient, [lab('a', '2026-05-01', 11, 'g/dL'), lab('b', '2026-10-01', 92, unit)], [], []).overview.pathology;
    assert.equal(entry.trend, 'Not comparable');
  }
});

test('empty patient has no invented case history', () => {
  const { overview } = buildPatientOverview(patient, [], [], []);
  assert.equal(overview.hasEvidence, false);
  assert.equal(overview.caseSummary, null);
  assert.deepEqual(overview.timeline, []);
  assert.deepEqual(overview.pathology, []);
});
