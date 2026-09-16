/**
 * Seeds dummy profiles/patients and exercises blood-summary parsing against
 * real PDFs in ../test-data (kept out of git because they contain PHI).
 *
 * Usage:
 *   npx tsx scripts/seed-and-test-blood-summary.ts
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { extractTextFromImage } from '../lib/services/ocr.service';
import { buildBloodReportSummary, parseBloodResults } from '../lib/reports/blood-summary';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Set DATABASE_URL or DIRECT_URL in .env.local');
}

const TEST_DATA_DIR = path.resolve(process.cwd(), '../test-data');
const DUMMY_USERS = [
  {
    userId: 'dummy-user-demo-001',
    firstName: 'Demo',
    lastName: 'Clinician',
    patient: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: '1985-03-12',
      gender: 'male',
    },
  },
  {
    userId: 'dummy-user-demo-002',
    firstName: 'Demo',
    lastName: 'Analyst',
    patient: {
      firstName: 'Vipul',
      lastName: 'Swarup',
      dateOfBirth: '1981-08-15',
      gender: 'male',
    },
  },
] as const;

/** Prefer recent files that fit a 90-day window from "today". */
const PRIORITY_FILES = [
  'Blood&Urine-21Jul2026-PartA.pdf',
  'Blood&Urine-21Jul2026-PartB.pdf',
  'Blood&Urine-1Jul2026-PartA.pdf',
  'Blood&Urine-1Jul2026-PartB.pdf',
  'Blood&UrineTests-VipulSwarup-10Jun26.PDF',
  'Blood&Urine-8May2026.pdf',
  'Blood&Urine-7April26.pdf',
  'CBC - 9Dec2025.pdf',
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function dateFromFileName(fileName: string): string | null {
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2,4})/i, (m) => {
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${year}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
    }],
    [/(\d{1,2})(January|February|March|April|May|June|July|August|September|October|November|December)(\d{2,4})/i, (m) => {
      const months: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      };
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${year}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
    }],
  ];
  for (const [regex, toIso] of patterns) {
    const match = fileName.match(regex);
    if (match) return toIso(match);
  }
  return null;
}

async function runParserUnitTests() {
  console.log('\n== Parser unit tests ==');
  const sample = `
DIAGNOSTIC REPORT
HEMOGLOBIN (HB) 12.1 13.0 - 17.0 g/dL
PLATELET COUNT 412 150 - 410 thou/uL
HBA1C 5.1
SERUM CREATININE 1.1 0.7 - 1.3 mg/dL
CREATININE, URINE 85.2
TRIGLYCERIDES 148
TSH 2.4 0.4 - 4.0
FERRITIN 45
TOTAL CHOLESTEROL 190
HDL CHOLESTEROL 48
ALT (SGPT) 32
`;
  const parsed = parseBloodResults(sample);
  const byMetric = Object.fromEntries(parsed.map((item) => [item.metric, item]));
  assert(byMetric.hemoglobin?.value === 12.1, 'hemoglobin parsed');
  assert(byMetric.creatinine?.value === 1.1, 'serum creatinine parsed');
  assert(byMetric.urine_creatinine?.value === 85.2, 'urine creatinine parsed');
  assert(byMetric.hba1c?.value === 5.1, 'hba1c parsed');
  assert(byMetric.triglycerides?.panel === 'cholesterol', 'triglycerides panel');
  assert(byMetric.tsh?.panel === 'thyroid', 'tsh panel');
  assert(byMetric.ferritin?.panel === 'iron', 'ferritin panel');
  assert(byMetric.alt?.panel === 'liver', 'alt panel');

  const kidneySample = `
PROTEIN, URINE 21.6 High < 15 mg/dL
CREATININE, URINE 50 39 - 259 mg/dL
PROTEIN/CREATININE RATIO 0.43 High < 0.2 mg/mg creat
SERUM CREATININE 1.16 0.7 - 1.3 mg/dL
`;
  const kidney = Object.fromEntries(parseBloodResults(kidneySample).map((item) => [item.metric, item]));
  assert(kidney.creatinine?.value === 1.16, 'serum creatinine not clubbed with PCR');
  assert(kidney.pcr?.value === 0.43, 'protein/creatinine ratio parsed separately');
  assert(kidney.urine_creatinine?.value === 50, 'urine creatinine parsed separately');
  assert(kidney.urine_protein?.value === 21.6, 'urine protein parsed separately');
  console.log(`Parser OK (${parsed.length} metrics + kidney disambiguation)`);
}

async function seedUsers(pool: Pool) {
  console.log('\n== Seeding dummy users/patients ==');
  const patientIds: string[] = [];
  for (const user of DUMMY_USERS) {
    await pool.query(
      `INSERT INTO profiles (user_id, first_name, last_name, onboarding_completed)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = NOW()`,
      [user.userId, user.firstName, user.lastName],
    );

    const existing = await pool.query(
      `SELECT id FROM patients
       WHERE owner_id = $1 AND first_name = $2 AND last_name = $3
       LIMIT 1`,
      [user.userId, user.patient.firstName, user.patient.lastName],
    );

    let patientId = existing.rows[0]?.id as string | undefined;
    if (!patientId) {
      const inserted = await pool.query(
        `INSERT INTO patients (owner_id, first_name, last_name, date_of_birth, gender)
         VALUES ($1, $2, $3, $4::date, $5)
         RETURNING id`,
        [user.userId, user.patient.firstName, user.patient.lastName, user.patient.dateOfBirth, user.patient.gender],
      );
      patientId = inserted.rows[0].id;
    }
    patientIds.push(patientId!);
    console.log(`User ${user.userId} -> patient ${patientId} (${user.patient.firstName} ${user.patient.lastName})`);
  }
  return patientIds;
}

async function choosePdfFiles(): Promise<string[]> {
  const available = new Set(await readdir(TEST_DATA_DIR));
  const selected = PRIORITY_FILES.filter((name) => available.has(name));
  if (selected.length === 0) {
    throw new Error(`No priority PDFs found in ${TEST_DATA_DIR}`);
  }
  // Cap OCR cost/time for local runs.
  return selected.slice(0, 4);
}

async function ingestReports(pool: Pool, ownerId: string, patientId: string, files: string[]) {
  console.log('\n== OCR + ingest reports ==');
  const created: Array<{ id: string; fileName: string; metrics: number; chars: number }> = [];

  for (const fileName of files) {
    const absolute = path.join(TEST_DATA_DIR, fileName);
    const documentDate = dateFromFileName(fileName) || new Date().toISOString().slice(0, 10);
    console.log(`OCR intake: ${fileName} (date ${documentDate})`);

    const ocrText = await extractTextFromImage(absolute, false, { mode: 'intake' });
    assert(ocrText.trim().length > 0, `OCR produced text for ${fileName}`);
    const metrics = parseBloodResults(ocrText);

    const r2Key = `local-test/${ownerId}/${Date.now()}-${fileName}`;
    const doc = await pool.query(
      `INSERT INTO documents (owner_id, patient_id, file_name, file_size, file_type, r2_key, storage_provider, status, ocr_status, ocr_text, ai_status)
       VALUES ($1, $2, $3, $4, 'application/pdf', $5, 'r2', 'COMPLETED', 'COMPLETED', $6, 'PENDING')
       RETURNING id`,
      [ownerId, patientId, fileName, ocrText.length, r2Key, ocrText],
    );

    const record = await pool.query(
      `INSERT INTO health_records (patient_id, record_type, data, tags, source, doctor_name, document_date, document_id, ocr_text)
       VALUES ($1::uuid, 'LAB_REPORT', '{}'::jsonb, ARRAY['lab_report','blood_test'], 'Agilus Diagnostics', NULL, $2::date, $3::uuid, $4)
       RETURNING id`,
      [patientId, documentDate, doc.rows[0].id, ocrText],
    );

    created.push({
      id: record.rows[0].id,
      fileName,
      metrics: metrics.length,
      chars: ocrText.length,
    });
    console.log(`  -> record ${record.rows[0].id}: ${ocrText.length} OCR chars, ${metrics.length} metrics`);
  }

  return created;
}

async function assertBloodSummary(pool: Pool, patientId: string) {
  console.log('\n== Blood summary assertions ==');
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 90);

  const { rows } = await pool.query(
    `SELECT id, source, ocr_text, document_date, created_at,
            COALESCE(document_date, created_at::date) AS effective_date
     FROM health_records
     WHERE patient_id = $1::uuid
       AND COALESCE(document_date, created_at::date) BETWEEN $2::date AND $3::date
       AND record_type = 'LAB_REPORT'`,
    [patientId, periodStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10)],
  );

  const summary = buildBloodReportSummary(
    rows.map((row) => ({
      id: row.id,
      date: new Date(row.effective_date || row.document_date || row.created_at),
      source: row.source || 'Unknown',
      ocrText: row.ocr_text || '',
    })),
  );

  console.log(`Candidate records in 90d: ${rows.length}`);
  console.log(`Reports with values: ${summary.reports.length}`);
  console.log(`Panels: ${summary.panels.map((p) => `${p.label}(${p.comparisons.length})`).join(', ') || '(none)'}`);
  console.log(`Key findings: ${summary.keyFindings.length}`);

  assert(rows.length > 0, 'seeded lab records exist in 90-day window');
  assert(summary.reports.length > 0, 'at least one report yielded extractable lab values');
  assert(summary.panels.length > 0, 'at least one clinical panel populated');
  assert(summary.comparisons.some((c) => ['hemoglobin', 'hba1c', 'creatinine', 'platelets', 'tsh', 'triglycerides'].includes(c.metric)), 'expected core blood metrics present');
  console.log('Blood summary OK');
  return summary;
}

async function main() {
  console.log('Test data dir:', TEST_DATA_DIR);
  await runParserUnitTests();

  const pool = new Pool({ connectionString });
  try {
    const patientIds = await seedUsers(pool);
    const files = await choosePdfFiles();
    console.log('Selected PDFs:', files.join(', '));

    // Attach reports to the Vipul dummy patient (second user).
    const ownerId = DUMMY_USERS[1].userId;
    const patientId = patientIds[1];
    const created = await ingestReports(pool, ownerId, patientId, files);
    assert(created.every((item) => item.chars > 50), 'OCR extracted meaningful text from each PDF');

    const summary = await assertBloodSummary(pool, patientId);
    console.log('\nDONE');
    console.log(JSON.stringify({
      dummyUsers: DUMMY_USERS.map((u) => u.userId),
      patientId,
      ingested: created,
      panels: summary.panels.map((p) => p.label),
      metrics: summary.comparisons.map((c) => c.metric),
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nTEST FAILED');
  console.error(error);
  process.exit(1);
});
