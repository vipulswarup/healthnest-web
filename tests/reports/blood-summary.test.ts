import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBloodReportSummary,
  normalizeLabUnit,
  parseBloodResults,
} from '../../lib/reports/blood-summary';

const AGILUS_STYLE_REPORT = `
BIOCHEMISTRY - LIPID
CHOLESTEROL, TOTAL 101 Acceptable <170 Borderline 170-
199 Abnormal >/=200
mg/dL
TRIGLYCERIDES 157 High Normal <150
mg/dL
HDL CHOLESTEROL 15 Low < 40 Low
mg/dL
CHOLESTEROL LDL 55 Optimal<100
mg/dL
VERY LOW DENSITY LIPOPROTEIN 31.4 High < /= 30 mg/dL
CHOL/HDL RATIO 6.7 High Optimal < 3.5
LDL/HDL RATIO 3.7 High Desirable/Low Risk: 0.5 -3.0

ENDOCRINOLOGY
FREE TRIIODOTHYRONINE (FT3) 2.93 2 - 4.4 pg/mL
FREE THYROXINE (FT4) 1.70 0.93 - 1.70 ng/dL
TSH (ULTRASENSITIVE) 3.520 0.270 - 4.200 μIU/mL

CLINICAL PATH - URINALYSIS
PHYSICAL EXAMINATION, URINE
COLOR PALE YELLOW
APPEARANCE CLEAR
CHEMICAL EXAMINATION, URINE
PH 6.5 4.5 - 7.5
SPECIFIC GRAVITY 1.015 1.005 - 1.030
PROTEIN DETECTED (+) NOT DETECTED
GLUCOSE NOT DETECTED NEGATIVE
MICROSCOPIC EXAMINATION, URINE
PUS CELL (WBCS) 2-3 0-5 /HPF
BACTERIA NOT DETECTED NOT DETECTED
YEAST NOT DETECTED NOT DETECTED

SPECIALISED CHEMISTRY - TUMOR MARKER
PROSTATE SPECIFIC ANTIGEN 0.258 0.0 - 2.0 ng/mL

SPECIALISED CHEMISTRY - VITAMIN
25 - HYDROXYVITAMIN D 43.10 Deficiency: < 20.0
Insufficiency: 21.0 - < 29.0
Sufficiency: > 30.0
ng/mL
VITAMIN B12 473.0 197 - 771 pg/mL
`;

test('extracts and normalizes numeric, range, and qualitative rows', () => {
  const parsed = parseBloodResults(AGILUS_STYLE_REPORT);
  const byMetric = Object.fromEntries(parsed.map((result) => [result.metric, result]));

  assert.equal(byMetric.tsh.rawValue, '3.520');
  assert.equal(byMetric.ft3.label, 'Free T3');
  assert.equal(byMetric.ft4.label, 'Free T4');
  assert.equal(byMetric.vitamin_d.rawValue, '43.10');
  assert.equal(byMetric.vitamin_d.unit, 'ng/mL');
  assert.equal(byMetric.vitamin_d.status, 'normal');
  assert.equal(byMetric.vitamin_b12.rawValue, '473.0');
  assert.equal(byMetric.psa_total.rawValue, '0.258');
  assert.equal(byMetric.urine_yeast.rawValue, 'NOT DETECTED');
  assert.equal(byMetric.urine_protein_qualitative.status, 'abnormal');
  assert.equal(byMetric.urine_wbc.valueType, 'range');
  assert.equal(byMetric.urine_wbc.rangeValueLow, 2);
  assert.equal(byMetric.urine_wbc.rangeValueHigh, 3);
  assert.equal(byMetric.hdl.status, 'low');
  assert.equal(byMetric.total_cholesterol.unit, 'mg/dL');
  assert.equal(byMetric.ldl.metric, 'ldl');
  assert.equal(byMetric.vldl.metric, 'vldl');
  assert.equal(byMetric.chol_hdl_ratio.status, 'high');
});

test('retains unfamiliar structured rows instead of dropping them', () => {
  const [result] = parseBloodResults('Biochemistry\nApolipoprotein Qx 42.5 10 - 50 mg/dL');
  assert.ok(result);
  assert.match(result.metric, /^unmapped_/);
  assert.equal(result.rawLabel, 'Apolipoprotein Qx');
  assert.equal(result.mappingConfidence, 'unmapped');
});

test('applies a user-confirmed source alias before fuzzy normalization', () => {
  const [result] = parseBloodResults(
    'THYROID\nTHYROTROPIN THIRD GENERATION 2.1 0.4 - 4.0 mIU/L',
    [{ rawLabel: 'THYROTROPIN THIRD GENERATION', metric: 'tsh' }],
  );
  assert.equal(result.metric, 'tsh');
  assert.equal(result.mappingConfidence, 'verified');
});

test('uses UCUM-compatible unit codes while preserving display units', () => {
  assert.equal(normalizeLabUnit('μIU/mL'), 'u[IU]/mL');
  assert.equal(normalizeLabUnit('/HPF'), '/[HPF]');
  assert.equal(normalizeLabUnit('mg/dL'), 'mg/dL');
});

test('builds findings for abnormal qualitative observations without numeric trends', () => {
  const summary = buildBloodReportSummary([{
    id: 'report-1',
    date: new Date('2026-08-12'),
    source: 'Example Lab',
    ocrText: AGILUS_STYLE_REPORT,
  }]);
  const protein = summary.comparisons.find((comparison) => comparison.metric === 'urine_protein_qualitative');
  assert.equal(protein?.direction, 'not-comparable');
  assert.ok(summary.keyFindings.some((finding) => finding.metric === 'urine_protein_qualitative'));
});
