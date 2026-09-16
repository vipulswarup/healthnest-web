export type RangeStatus = 'low' | 'normal' | 'high' | 'abnormal' | 'unknown';
export type LabValueType = 'numeric' | 'range' | 'qualitative';
export type MappingConfidence = 'verified' | 'alias' | 'unmapped';

export type LabPanel =
  | 'blood'
  | 'iron'
  | 'kidney'
  | 'liver'
  | 'cholesterol'
  | 'thyroid'
  | 'diabetes'
  | 'vitamins'
  | 'urinalysis'
  | 'tumor_markers'
  | 'other';

export interface LabResult {
  metric: string;
  label: string;
  panel: LabPanel;
  /** Numeric scalar used for charting. Null for ranges and qualitative values. */
  value: number | null;
  valueType: LabValueType;
  /** Result exactly as presented by the laboratory, without its flag or unit. */
  rawValue: string;
  rangeValueLow: number | null;
  rangeValueHigh: number | null;
  unit: string | null;
  /** Normalized UCUM-compatible form when the unit is recognized. */
  unitCode?: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText?: string | null;
  flagText?: string | null;
  rawLabel?: string;
  mappingConfidence?: MappingConfidence;
  status: RangeStatus;
}

export interface BloodReportInput {
  id: string;
  date: Date;
  source: string;
  documentPath?: string;
  ocrText?: string;
  /** When true, use manualResults instead of OCR parse for this report. */
  useManualResults?: boolean;
  manualResults?: LabResult[];
  /** User-confirmed local lab labels for this report's source. */
  aliasMappings?: LabAliasMapping[];
}

export interface BloodReport extends BloodReportInput {
  results: LabResult[];
}

export interface LabMetricOption {
  metric: string;
  label: string;
  panel: LabPanel;
}

export interface LabAliasMapping {
  rawLabel: string;
  metric: string;
}

export interface MetricComparison {
  metric: string;
  label: string;
  panel: LabPanel;
  unit: string | null;
  results: Array<LabResult & { reportId: string; date: Date; source: string; documentPath?: string }>;
  change: number | null;
  changePercent: number | null;
  direction: 'increased' | 'decreased' | 'unchanged' | 'not-comparable';
}

export interface KeyFinding {
  severity: 'attention' | 'change' | 'information';
  text: string;
  /** Metric that produced this finding. Omitted for report-wide information. */
  metric?: string;
}

export interface PanelSummary {
  panel: LabPanel;
  label: string;
  comparisons: MetricComparison[];
}

const PANEL_LABELS: Record<LabPanel, string> = {
  blood: 'Blood (CBC)',
  iron: 'Iron studies',
  kidney: 'Kidney',
  liver: 'Liver',
  cholesterol: 'Cholesterol / lipids',
  thyroid: 'Thyroid',
  diabetes: 'Diabetes / glucose',
  vitamins: 'Vitamins & inflammation',
  urinalysis: 'Urinalysis',
  tumor_markers: 'Tumour markers',
  other: 'Other tests',
};

const PANEL_ORDER: LabPanel[] = [
  'blood',
  'diabetes',
  'iron',
  'kidney',
  'liver',
  'cholesterol',
  'thyroid',
  'vitamins',
  'urinalysis',
  'tumor_markers',
  'other',
];

interface MetricDefinition {
  metric: string;
  label: string;
  panel: LabPanel;
  aliases: string[];
}

const METRICS: MetricDefinition[] = [
  // Blood / CBC
  { metric: 'hemoglobin', label: 'Hemoglobin', panel: 'blood', aliases: ['haemoglobin', 'hemoglobin', 'hb'] },
  { metric: 'total_wbc', label: 'Total WBC', panel: 'blood', aliases: ['total leukocyte count', 'total wbc count', 'white blood cell count', 'wbc count', 'wbc', 'tlc'] },
  { metric: 'rbc', label: 'RBC', panel: 'blood', aliases: ['red blood cell count', 'rbc count', 'rbc'] },
  { metric: 'hematocrit', label: 'Hematocrit (PCV)', panel: 'blood', aliases: ['hematocrit', 'packed cell volume', 'pcv'] },
  { metric: 'platelets', label: 'Platelets', panel: 'blood', aliases: ['platelet count', 'platelets'] },
  { metric: 'mcv', label: 'MCV', panel: 'blood', aliases: ['mean corpuscular volume', 'mcv'] },
  { metric: 'mch', label: 'MCH', panel: 'blood', aliases: ['mean corpuscular hemoglobin', 'mean corpuscular haemoglobin', 'mch'] },
  { metric: 'mchc', label: 'MCHC', panel: 'blood', aliases: ['mean corpuscular hemoglobin concentration', 'mean corpuscular haemoglobin concentration', 'mchc'] },
  { metric: 'rdw', label: 'RDW', panel: 'blood', aliases: ['red cell distribution width', 'rdw'] },
  { metric: 'mpv', label: 'MPV', panel: 'blood', aliases: ['mean platelet volume', 'mpv'] },
  { metric: 'neutrophils', label: 'Neutrophils', panel: 'blood', aliases: ['neutrophils', 'neutrophil'] },
  { metric: 'lymphocytes', label: 'Lymphocytes', panel: 'blood', aliases: ['lymphocytes', 'lymphocyte'] },
  { metric: 'monocytes', label: 'Monocytes', panel: 'blood', aliases: ['monocytes', 'monocyte'] },
  { metric: 'eosinophils', label: 'Eosinophils', panel: 'blood', aliases: ['eosinophils', 'eosinophil'] },
  { metric: 'basophils', label: 'Basophils', panel: 'blood', aliases: ['basophils', 'basophil'] },
  { metric: 'absolute_neutrophils', label: 'Absolute neutrophil count', panel: 'blood', aliases: ['absolute neutrophil count', 'anc'] },
  { metric: 'absolute_lymphocytes', label: 'Absolute lymphocyte count', panel: 'blood', aliases: ['absolute lymphocyte count', 'alc'] },
  { metric: 'absolute_monocytes', label: 'Absolute monocyte count', panel: 'blood', aliases: ['absolute monocyte count'] },
  { metric: 'absolute_eosinophils', label: 'Absolute eosinophil count', panel: 'blood', aliases: ['absolute eosinophil count'] },
  { metric: 'absolute_basophils', label: 'Absolute basophil count', panel: 'blood', aliases: ['absolute basophil count'] },
  { metric: 'esr', label: 'ESR', panel: 'blood', aliases: ['erythrocyte sedimentation rate', 'e s r', 'esr'] },

  // Diabetes
  { metric: 'fasting_glucose', label: 'Fasting glucose', panel: 'diabetes', aliases: ['fasting blood sugar', 'fasting plasma glucose', 'fasting glucose', 'fbs', 'fpg'] },
  { metric: 'postprandial_glucose', label: 'Post-prandial glucose', panel: 'diabetes', aliases: ['post prandial blood sugar', 'postprandial glucose', 'ppbs', 'ppg'] },
  { metric: 'hba1c', label: 'HbA1c', panel: 'diabetes', aliases: ['glycosylated hemoglobin', 'glycated hemoglobin', 'hba1c', 'hb a1c', 'a1c'] },

  // Iron
  { metric: 'ferritin', label: 'Ferritin', panel: 'iron', aliases: ['serum ferritin', 'ferritin'] },
  { metric: 'serum_iron', label: 'Serum iron', panel: 'iron', aliases: ['serum iron', 'iron'] },
  { metric: 'tibc', label: 'TIBC', panel: 'iron', aliases: ['total iron binding capacity', 'tibc'] },
  { metric: 'transferrin_saturation', label: 'Transferrin saturation', panel: 'iron', aliases: ['transferrin saturation', 'iron saturation', '% saturation'] },

  // Kidney
  { metric: 'urea', label: 'Urea', panel: 'kidney', aliases: ['blood urea nitrogen', 'blood urea', 'urea nitrogen', 'urea', 'bun'] },
  // Parse ratio / urine forms before bare "creatinine" so labels are not clubbed.
  { metric: 'pcr', label: 'Protein/Creatinine ratio', panel: 'kidney', aliases: ['urinary protein creatinine ratio', 'protein/creatinine ratio', 'protein creatinine ratio', 'protein/creatinine', 'pcr'] },
  { metric: 'urine_protein', label: 'Urine protein', panel: 'kidney', aliases: ['protein, urine', 'urine protein', 'protein urine'] },
  { metric: 'urine_creatinine', label: 'Urine creatinine', panel: 'kidney', aliases: ['creatinine, urine', 'urine creatinine', 'creatinine urine'] },
  { metric: 'creatinine', label: 'Serum creatinine', panel: 'kidney', aliases: ['serum creatinine', 'creatinine'] },
  { metric: 'egfr', label: 'eGFR', panel: 'kidney', aliases: ['estimated gfr', 'egfr', 'gfr'] },
  { metric: 'uric_acid', label: 'Uric acid', panel: 'kidney', aliases: ['serum uric acid', 'uric acid'] },
  { metric: 'sodium', label: 'Sodium', panel: 'kidney', aliases: ['serum sodium', 'sodium'] },
  { metric: 'potassium', label: 'Potassium', panel: 'kidney', aliases: ['serum potassium', 'potassium'] },
  { metric: 'calcium', label: 'Calcium', panel: 'kidney', aliases: ['serum calcium', 'calcium'] },

  // Liver
  { metric: 'alt', label: 'ALT (SGPT)', panel: 'liver', aliases: ['alanine aminotransferase', 'sgpt', 'alt'] },
  { metric: 'ast', label: 'AST (SGOT)', panel: 'liver', aliases: ['aspartate aminotransferase', 'sgot', 'ast'] },
  { metric: 'alp', label: 'Alkaline phosphatase', panel: 'liver', aliases: ['alkaline phosphatase', 'alp'] },
  { metric: 'ggt', label: 'GGT', panel: 'liver', aliases: ['gamma gt', 'ggt', 'ggtp'] },
  { metric: 'bilirubin_total', label: 'Total bilirubin', panel: 'liver', aliases: ['total bilirubin', 'bilirubin total'] },
  { metric: 'bilirubin_direct', label: 'Direct bilirubin', panel: 'liver', aliases: ['direct bilirubin', 'bilirubin direct', 'conjugated bilirubin'] },
  { metric: 'bilirubin_indirect', label: 'Indirect bilirubin', panel: 'liver', aliases: ['indirect bilirubin', 'bilirubin indirect', 'unconjugated bilirubin'] },
  { metric: 'albumin', label: 'Albumin', panel: 'liver', aliases: ['serum albumin', 'albumin'] },
  { metric: 'total_protein', label: 'Total protein', panel: 'liver', aliases: ['total protein', 'serum protein'] },

  // Cholesterol
  { metric: 'total_cholesterol', label: 'Total cholesterol', panel: 'cholesterol', aliases: ['total cholesterol', 'cholesterol total', 'cholesterol, total'] },
  { metric: 'triglycerides', label: 'Triglycerides', panel: 'cholesterol', aliases: ['serum triglycerides', 'triglycerides'] },
  { metric: 'hdl', label: 'HDL cholesterol', panel: 'cholesterol', aliases: ['hdl cholesterol', 'hdl-c', 'hdl'] },
  { metric: 'ldl', label: 'LDL cholesterol', panel: 'cholesterol', aliases: ['ldl cholesterol', 'cholesterol ldl', 'ldl-c', 'ldl'] },
  { metric: 'vldl', label: 'VLDL cholesterol', panel: 'cholesterol', aliases: ['very low density lipoprotein', 'vldl cholesterol', 'vldl'] },
  { metric: 'non_hdl', label: 'Non-HDL cholesterol', panel: 'cholesterol', aliases: ['non hdl cholesterol', 'non-hdl cholesterol', 'non-hdl', 'non hdl'] },
  { metric: 'chol_hdl_ratio', label: 'Cholesterol/HDL ratio', panel: 'cholesterol', aliases: ['cholesterol hdl ratio', 'chol hdl ratio', 'tc hdl ratio'] },
  { metric: 'ldl_hdl_ratio', label: 'LDL/HDL ratio', panel: 'cholesterol', aliases: ['ldl hdl ratio'] },

  // Thyroid
  { metric: 'tsh', label: 'TSH', panel: 'thyroid', aliases: ['thyroid stimulating hormone', 'tsh ultrasensitive', 'ultrasensitive tsh', 'serum tsh', 'tsh'] },
  { metric: 'ft3', label: 'Free T3', panel: 'thyroid', aliases: ['free triiodothyronine ft3', 'free triiodothyronine', 'free t3', 'ft3'] },
  { metric: 'ft4', label: 'Free T4', panel: 'thyroid', aliases: ['free thyroxine ft4', 'free thyroxine', 'free t4', 'ft4'] },
  { metric: 't3', label: 'Total T3', panel: 'thyroid', aliases: ['total triiodothyronine', 'total t3', 't3 total', 't3'] },
  { metric: 't4', label: 'Total T4', panel: 'thyroid', aliases: ['total thyroxine', 'total t4', 't4 total', 't4'] },

  // Vitamins / inflammation
  { metric: 'vitamin_d', label: '25-OH Vitamin D', panel: 'vitamins', aliases: ['25 hydroxyvitamin d vitamin d total', '25 hydroxyvitamin d', '25 hydroxy vitamin d total', '25 hydroxy vitamin d', '25 oh vitamin d total', '25 oh vitamin d', 'vitamin d 25 oh', 'vitamin d total'] },
  { metric: 'vitamin_b12', label: 'Vitamin B12', panel: 'vitamins', aliases: ['vitamin b12 cyanocobalamine', 'vitamin b12 cyanocobalamin', 'vitamin b12', 'vit b12', 'b12'] },
  { metric: 'folate', label: 'Folate', panel: 'vitamins', aliases: ['folic acid', 'folate'] },
  { metric: 'crp', label: 'CRP', panel: 'vitamins', aliases: ['c reactive protein', 'c-reactive protein', 'crp'] },

  // Urinalysis: keep urine observations distinct from serum/blood observations.
  { metric: 'urine_color', label: 'Urine colour', panel: 'urinalysis', aliases: ['urine color', 'urine colour', 'color', 'colour'] },
  { metric: 'urine_appearance', label: 'Urine appearance', panel: 'urinalysis', aliases: ['urine appearance', 'appearance', 'clarity'] },
  { metric: 'urine_ph', label: 'Urine pH', panel: 'urinalysis', aliases: ['urine ph', 'ph'] },
  { metric: 'urine_specific_gravity', label: 'Urine specific gravity', panel: 'urinalysis', aliases: ['urine specific gravity', 'specific gravity'] },
  { metric: 'urine_protein_qualitative', label: 'Urine protein', panel: 'urinalysis', aliases: ['urine protein qualitative', 'protein'] },
  { metric: 'urine_glucose', label: 'Urine glucose', panel: 'urinalysis', aliases: ['urine glucose', 'glucose'] },
  { metric: 'urine_ketones', label: 'Urine ketones', panel: 'urinalysis', aliases: ['urine ketones', 'ketone bodies', 'ketones'] },
  { metric: 'urine_blood', label: 'Urine blood', panel: 'urinalysis', aliases: ['occult blood urine', 'urine blood', 'blood'] },
  { metric: 'urine_bilirubin', label: 'Urine bilirubin', panel: 'urinalysis', aliases: ['urine bilirubin', 'bilirubin'] },
  { metric: 'urine_urobilinogen', label: 'Urine urobilinogen', panel: 'urinalysis', aliases: ['urine urobilinogen', 'urobilinogen'] },
  { metric: 'urine_nitrite', label: 'Urine nitrite', panel: 'urinalysis', aliases: ['urine nitrite', 'nitrite'] },
  { metric: 'urine_leukocyte_esterase', label: 'Urine leukocyte esterase', panel: 'urinalysis', aliases: ['urine leukocyte esterase', 'leukocyte esterase'] },
  { metric: 'urine_rbc', label: 'Urine red blood cells', panel: 'urinalysis', aliases: ['red blood cells urine', 'urine red blood cells', 'red blood cells', 'rbcs'] },
  { metric: 'urine_wbc', label: 'Urine pus cells (WBCs)', panel: 'urinalysis', aliases: ['pus cell wbcs', 'pus cells wbcs', 'urine pus cells', 'pus cells', 'pus cell', 'urine wbcs'] },
  { metric: 'urine_epithelial_cells', label: 'Urine epithelial cells', panel: 'urinalysis', aliases: ['urine epithelial cells', 'epithelial cells'] },
  { metric: 'urine_casts', label: 'Urine casts', panel: 'urinalysis', aliases: ['urine casts', 'casts'] },
  { metric: 'urine_crystals', label: 'Urine crystals', panel: 'urinalysis', aliases: ['urine crystals', 'crystals'] },
  { metric: 'urine_bacteria', label: 'Urine bacteria', panel: 'urinalysis', aliases: ['urine bacteria', 'bacteria'] },
  { metric: 'urine_yeast', label: 'Urine yeast', panel: 'urinalysis', aliases: ['urine yeast', 'yeast cells', 'yeast'] },

  // Tumour markers
  { metric: 'psa_total', label: 'PSA, total', panel: 'tumor_markers', aliases: ['prostate specific antigen psa total', 'prostate specific antigen total', 'prostate specific antigen', 'total psa', 'psa total'] },
  { metric: 'psa_free', label: 'PSA, free', panel: 'tumor_markers', aliases: ['free prostate specific antigen', 'free psa', 'psa free'] },
  { metric: 'psa_free_percent', label: 'Free PSA percentage', panel: 'tumor_markers', aliases: ['free psa percent', 'percent free psa', 'psa free percentage'] },
];

const numberToken = '-?\\d+(?:[,.]\\d+)?';
const numericRangeToken = numberToken + '\\s*(?:-|–|—|to)\\s*' + numberToken;
const numberPattern = '(' + numberToken + ')';

const qualitativeToken = [
  'not\\s+detected', 'non[ -]?reactive', 'detected(?:\\s*\\([^)]*\\))?', 'positive(?:\\s*\\([^)]*\\))?',
  'negative', 'reactive', 'normal', 'abnormal', 'clear', 'turbid', 'cloudy', 'pale\\s+yellow',
  'yellow', 'amber', 'colourless', 'colorless', 'trace', 'present', 'absent', 'nil',
].join('|');
const resultToken = '(?:' + qualitativeToken + '|' + numericRangeToken + '|' + numberToken + ')';
const resultRowPattern = new RegExp(
  '^(.{2,100}?)\\s+(' + resultToken + ')(?=\\s+(?:low|high|abnormal|critical|' + numberToken
    + '|[<>]=?|not\\s+detected|negative|normal|[/%A-Za-zμµ])|$)(.*)$',
  'i',
);
const rangePattern = new RegExp('(' + numberToken + ')\\s*(?:-|–|—|to)\\s*(' + numberToken + ')', 'i');

const DISPLAY_UNIT_PATTERN = /(?:mg\/(?:dL|dl|L|l|mg(?:\s*creat(?:inine)?)?)|g\/(?:dL|dl|L|l)|mmol\/L|mMol\/L|umol\/L|µmol\/L|μmol\/L|uIU\/mL|µIU\/mL|μIU\/mL|ng\/(?:mL|ml|dL|dl)|pg\/(?:mL|ml)|ug\/(?:mL|ml|dL|dl)|µg\/(?:mL|ml|dL|dl)|μg\/(?:mL|ml|dL|dl)|IU\/L|U\/L|mIU\/L|%|fL|fl|pg|mm\/(?:hr|h)|\/(?:HPF|LPF)|thou\/[uμµ]L|mill\/[uμµ]L)/i;

const UCUM_UNITS: Array<[RegExp, string]> = [
  [/^mg\/(?:dL|dl)$/i, 'mg/dL'], [/^g\/(?:dL|dl)$/i, 'g/dL'], [/^mg\/L$/i, 'mg/L'], [/^g\/L$/i, 'g/L'],
  [/^(?:mmol|mMol)\/L$/i, 'mmol/L'], [/^(?:u|μ|µ)mol\/L$/i, 'umol/L'], [/^(?:u|μ|µ)IU\/mL$/i, 'u[IU]/mL'],
  [/^mIU\/L$/i, 'm[IU]/L'], [/^IU\/L$/i, '[IU]/L'], [/^U\/L$/i, 'U/L'], [/^ng\/mL$/i, 'ng/mL'],
  [/^pg\/mL$/i, 'pg/mL'], [/^(?:u|μ|µ)g\/(?:dL|dl)$/i, 'ug/dL'], [/^(?:u|μ|µ)g\/mL$/i, 'ug/mL'],
  [/^mg\/mg(?:\s*creat(?:inine)?)?$/i, 'mg/mg'], [/^%$/, '%'], [/^(?:fL|fl)$/i, 'fL'], [/^pg$/i, 'pg'],
  [/^mm\/(?:hr|h)$/i, 'mm/h'], [/^\/HPF$/i, '/[HPF]'], [/^\/LPF$/i, '/[LPF]'],
  [/^(?:thou|10\^3)\/(?:u|μ|µ)L$/i, '10*3/uL'], [/^(?:mill|10\^6)\/(?:u|μ|µ)L$/i, '10*6/uL'],
];

function normaliseWords(value: string): string {
  return value.normalize('NFKD').replace(/[μµ]/g, 'u').replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase().replace(/\s+/g, ' ');
}

function slug(value: string): string {
  return normaliseWords(value).replace(/\s+/g, '_').slice(0, 80) || 'unmapped_test';
}

function titleCaseLabel(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Unmapped test';
  return compact.toLowerCase().replace(
    /(^|[\s/(])([a-z])/g,
    (_, before: string, letter: string) => before + letter.toUpperCase(),
  );
}

export function normalizeLabUnit(unit: string | null): string | null {
  if (!unit) return null;
  const cleaned = unit.trim().replace(/\s+/g, ' ');
  return UCUM_UNITS.find(([pattern]) => pattern.test(cleaned))?.[1] || null;
}

function normaliseUnit(unit: string | null): string | null {
  return normalizeLabUnit(unit) || unit?.toLowerCase().replace(/[\s.]/g, '').replace(/[μµ]/g, 'u') || null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Null/missing OCR units are treated as compatible with a known unit. */
function unitsCompatible(a: string | null, b: string | null): boolean {
  const na = normaliseUnit(a);
  const nb = normaliseUnit(b);
  if (!na || !nb) return true;
  return na === nb;
}

function pickTrendEndpoints<T extends { date: Date; unit: string | null; value: number | null }>(
  results: T[],
): { oldest: T & { value: number }; newest: T & { value: number } } | null {
  const numeric = results.filter((result): result is T & { value: number } => result.value !== null);
  if (numeric.length < 2) return null;

  const unitCounts = new Map<string, number>();
  for (const result of numeric) {
    const key = normaliseUnit(result.unit);
    if (!key) continue;
    unitCounts.set(key, (unitCounts.get(key) || 0) + 1);
  }
  const dominantUnit = [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const comparable = dominantUnit
    ? numeric.filter((result) => unitsCompatible(result.unit, dominantUnit))
    : numeric;
  if (comparable.length < 2) return null;
  return { oldest: comparable[0], newest: comparable[comparable.length - 1] };
}

export function valueStatus(value: number, low: number | null, high: number | null): RangeStatus {
  if (low === null && high === null) return 'unknown';
  if (low !== null && value < low) return 'low';
  if (high !== null && value > high) return 'high';
  if (low !== null || high !== null) return 'normal';
  return 'unknown';
}

export function formatLabResultValue(result: Pick<LabResult, 'value' | 'rawValue' | 'unit'>): string {
  const displayed = result.rawValue || (result.value === null ? '—' : String(result.value));
  return `${displayed}${result.unit ? ` ${result.unit}` : ''}`;
}

export const LAB_METRIC_OPTIONS: LabMetricOption[] = METRICS.map((item) => ({
  metric: item.metric,
  label: item.label,
  panel: item.panel,
}));

const PANEL_SET = new Set<string>(Object.keys(PANEL_LABELS));

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Accepts stored JSON / editor payloads and returns validated LabResult rows. */
export function sanitizeLabResults(raw: unknown): LabResult[] {
  if (!Array.isArray(raw)) return [];
  const byMetric = new Map<string, LabResult>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const metric = String(row.metric || '').trim();
    const value = asNumberOrNull(row.value);
    const rawValue = String(row.rawValue ?? (value === null ? '' : value)).trim();
    const valueTypeRaw = String(row.valueType || '');
    const valueType: LabValueType = ['numeric', 'range', 'qualitative'].includes(valueTypeRaw)
      ? valueTypeRaw as LabValueType
      : value !== null ? 'numeric' : 'qualitative';
    if (!metric || !rawValue) continue;
    const option = LAB_METRIC_OPTIONS.find((entry) => entry.metric === metric);
    const panelRaw = String(row.panel || option?.panel || 'other');
    const panel = (PANEL_SET.has(panelRaw) ? panelRaw : 'other') as LabPanel;
    const label = String(row.label || option?.label || metric).trim() || metric;
    const unitRaw = row.unit === null || row.unit === undefined || row.unit === '' ? null : String(row.unit).trim();
    const referenceLow = asNumberOrNull(row.referenceLow);
    const referenceHigh = asNumberOrNull(row.referenceHigh);
    const statusRaw = String(row.status || '');
    const status: RangeStatus = ['low', 'normal', 'high', 'abnormal', 'unknown'].includes(statusRaw)
      ? (statusRaw as RangeStatus)
      : value !== null ? valueStatus(value, referenceLow, referenceHigh) : 'unknown';
    byMetric.set(metric, {
      metric,
      label,
      panel,
      value,
      valueType,
      rawValue,
      rangeValueLow: asNumberOrNull(row.rangeValueLow),
      rangeValueHigh: asNumberOrNull(row.rangeValueHigh),
      unit: unitRaw,
      unitCode: row.unitCode ? String(row.unitCode) : normalizeLabUnit(unitRaw),
      referenceLow,
      referenceHigh,
      referenceText: row.referenceText ? String(row.referenceText) : null,
      flagText: row.flagText ? String(row.flagText) : null,
      rawLabel: row.rawLabel ? String(row.rawLabel) : undefined,
      mappingConfidence: ['verified', 'alias', 'unmapped'].includes(String(row.mappingConfidence))
        ? row.mappingConfidence as MappingConfidence
        : option ? 'verified' : 'unmapped',
      status,
    });
  }
  return [...byMetric.values()];
}

export function resolveReportResults(input: BloodReportInput): LabResult[] {
  if (input.useManualResults) return sanitizeLabResults(input.manualResults || []);
  return parseBloodResults(input.ocrText, input.aliasMappings);
}

/** True when health_record.data marks lab values as manually curated. */
export function hasManualLabOverride(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return (data as Record<string, unknown>).labResultsManual === true;
}

export function readManualLabResults(data: unknown): LabResult[] {
  if (!data || typeof data !== 'object') return [];
  return sanitizeLabResults((data as Record<string, unknown>).labResults);
}

/**
 * Extracts recognised lab values from OCR text.
 * Searches the whole document per metric so multi-test lines still work.
 */
export function parseBloodResultsLegacy(ocrText = ''): LabResult[] {
  const results = new Map<string, LabResult>();
  const text = ocrText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
  if (!text.trim()) return [];

  for (const definition of METRICS) {
    const aliases = [...definition.aliases].sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
      const aliasRegex = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, 'ig');
      let aliasMatch: RegExpExecArray | null;
      let matchedAt: number | null = null;
      while ((aliasMatch = aliasRegex.exec(text)) !== null) {
        // Use a tight local window so neighbouring lines do not leak (e.g. "RATIO" above serum creatinine).
        const labelStart = aliasMatch.index + (aliasMatch[1] ? aliasMatch[1].length : 0);
        const labelEnd = labelStart + alias.length;
        const around = text.slice(Math.max(0, labelStart - 18), labelEnd + 18).toLowerCase();
        const matchedLabel = text.slice(labelStart, labelEnd).toLowerCase();

        // Keep serum creatinine, urine creatinine, and protein/creatinine ratio distinct.
        if (definition.metric === 'creatinine') {
          if (/urine/.test(around)) continue;
          if (/protein\s*\/|\/\s*creatinine|protein\s*creatinine|creatinine\s*ratio|\bpcr\b/.test(around)) {
            continue;
          }
        }
        if (definition.metric === 'urine_creatinine') {
          if (!/urine/.test(around) && !/urine/.test(matchedLabel)) continue;
          if (/protein\s*\/|protein\s*creatinine|creatinine\s*ratio|\bpcr\b/.test(matchedLabel + around.slice(0, 12))) {
            continue;
          }
        }
        if (definition.metric === 'pcr') {
          if (!/(protein|ratio|pcr)/.test(matchedLabel) && !/(protein\s*\/|ratio|\bpcr\b)/.test(around)) {
            continue;
          }
        }
        if (definition.metric === 'urine_protein') {
          if (!/urine|protein\s*,/.test(around) && !/urine/.test(matchedLabel)) continue;
          if (/creatinine/.test(matchedLabel) || /protein\s*\/\s*creatinine|creatinine\s*ratio/.test(around)) {
            continue;
          }
        }
        if (definition.metric === 'total_cholesterol' && /(hdl|ldl|vldl|non)/.test(around)) continue;
        if ((definition.metric === 'hdl' || definition.metric === 'ldl') && /non[\s-]*hdl|non[\s-]*ldl/.test(around)) {
          continue;
        }
        matchedAt = labelStart;
        break;
      }
      if (matchedAt === null) continue;

      const start = matchedAt + alias.length;
      // Limit to the remainder of this line so the next analyte is not pulled into the window.
      const lineEnd = text.indexOf('\n', start);
      const rawWindow = text.slice(start, lineEnd === -1 ? start + 160 : lineEnd);
      const window = rawWindow.replace(/^\s*(?:\([^)]{1,24}\)|\[[^\]]{1,24}\])?\s*[:=\-–—]?\s*/i, '');
      const valueMatch = window.match(new RegExp(`^${numberPattern}`))
        || window.match(new RegExp(`(?:^|\\s)${numberPattern}`));
      if (!valueMatch) continue;
      const valueToken = valueMatch[1] || valueMatch[0];

      const value = Number(String(valueToken).replace(',', '.'));
      if (!Number.isFinite(value)) continue;

      const valueIndex = window.search(new RegExp(escapeRegex(String(valueToken))));
      const afterValue = window.slice(valueIndex + String(valueToken).length).trim();
      // Support "< 0.2 mg/mg" style ceilings and "0.7 - 1.3 mg/dL" ranges on the same line.
      const ceilingMatch = afterValue.match(new RegExp(`(?:<|>|<=|>=)\\s*${numberPattern}`, 'i'));
      const rangeMatch = afterValue.match(rangePattern);
      let referenceLow: number | null = rangeMatch ? Number(rangeMatch[1].replace(',', '.')) : null;
      let referenceHigh: number | null = rangeMatch ? Number(rangeMatch[2].replace(',', '.')) : null;
      if (!rangeMatch && ceilingMatch) {
        const bound = Number(ceilingMatch[1].replace(',', '.'));
        if (Number.isFinite(bound)) {
          if (/</.test(ceilingMatch[0])) referenceHigh = bound;
          else referenceLow = bound;
        }
      }

      // Prefer real units; skip status words (High/Low) and single-letter flags.
      const unitMatch = afterValue.match(
        /(?:^|\s)((?:mg\/(?:dL|dl|L|l|mg(?:\s*creat)?)|g\/(?:dL|dl|L|l)|mmol\/L|umol\/L|µmol\/L|μmol\/L|ng\/(?:mL|ml|dL|dl)|pg\/(?:mL|ml)|ug\/(?:mL|ml|dL|dl)|IU\/L|U\/L|mIU\/L|%|fL|fl|pg|mm\/hr|mm))(?=\s|$)/i,
      )
        || afterValue.match(/(?:^|\s)([a-zA-Zμµ][a-zA-Z0-9μµ/%^.-]{1,18})(?=\s|$)/);
      let unit = unitMatch?.[1] || null;
      if (unit && /^(high|low|normal|h|l|final|method)$/i.test(unit)) unit = null;

      results.set(definition.metric, {
        metric: definition.metric,
        label: definition.label,
        panel: definition.panel,
        value,
        valueType: 'numeric',
        rawValue: String(value),
        rangeValueLow: null,
        rangeValueHigh: null,
        unit,
        unitCode: normalizeLabUnit(unit),
        referenceLow: Number.isFinite(referenceLow as number) ? referenceLow : null,
        referenceHigh: Number.isFinite(referenceHigh as number) ? referenceHigh : null,
        referenceText: afterValue || null,
        rawLabel: alias,
        mappingConfidence: 'alias',
        status: valueStatus(value, referenceLow, referenceHigh),
      });
      break;
    }
  }

  return [...results.values()];
}

function panelFromHeading(line: string, current: LabPanel | null): LabPanel | null {
  const value = normaliseWords(line);
  if (/interpretation|comments|end of report|test description/.test(value)) return null;
  const letters = line.replace(/[^A-Za-z]/g, '');
  const capitals = letters.replace(/[^A-Z]/g, '');
  const headingLike = line.length <= 120 && letters.length > 0 && capitals.length / letters.length >= 0.7;
  if (!headingLike) return current;
  if (/urinalysis|examination urine|urine routine|urine analysis/.test(value)) return 'urinalysis';
  if (/tumou?r marker/.test(value)) return 'tumor_markers';
  if (/thyroid|endocrinology/.test(value)) return 'thyroid';
  if (/lipid|cholesterol/.test(value) && !/^[a-z ]+ \d/.test(value)) return 'cholesterol';
  if (/hematology|haematology|complete blood count|cbc/.test(value)) return 'blood';
  if (/iron studies|iron profile/.test(value)) return 'iron';
  if (/kidney|renal function/.test(value)) return 'kidney';
  if (/liver|hepatic/.test(value)) return 'liver';
  if (/diabetes|glycated|glucose profile/.test(value)) return 'diabetes';
  if (/vitamin/.test(value) && !/\d/.test(value)) return 'vitamins';
  return current;
}

function isPlausibleResultLabel(label: string): boolean {
  const normalized = normaliseWords(label);
  if (normalized.length < 2 || normalized.length > 90) return false;
  if (/^(method|page|patient|accession|sample|reported|received|drawn|reference|test report|sr no|age|sex|doctor|interpretation|note|result|unit|complete care|tel|new delhi)/.test(normalized)) return false;
  if (/www|email|telephone|diagnostics|laboratory|borderline|desirable|optimal|high risk|low risk|sufficiency|insufficiency|deficiency/.test(normalized)) return false;
  return /[a-z]/.test(normalized);
}

function definitionMatchesContext(definition: MetricDefinition, rawLabel: string, panel: LabPanel | null): boolean {
  const label = normaliseWords(rawLabel);
  if (definition.panel === 'urinalysis' && panel !== 'urinalysis' && !/urine/.test(label)) return false;
  if (definition.metric === 'creatinine' && /urine|protein creatinine|ratio/.test(label)) return false;
  if (definition.metric === 'urine_creatinine' && !/urine/.test(label) && panel !== 'urinalysis') return false;
  if (definition.metric === 'pcr' && !/protein|ratio|pcr/.test(label)) return false;
  if (definition.metric === 'total_cholesterol' && /hdl|ldl|vldl|non/.test(label)) return false;
  if ((definition.metric === 'hdl' || definition.metric === 'ldl') && /non hdl|non ldl|ratio/.test(label)) return false;
  if ((definition.metric === 't3' || definition.metric === 't4') && /free|ft3|ft4/.test(label)) return false;
  if (definition.metric === 'psa_total' && /free|percent|percentage/.test(label)) return false;
  return true;
}

function normalizeMetric(rawLabel: string, panel: LabPanel | null, aliasMappings: LabAliasMapping[]): {
  metric: string; label: string; panel: LabPanel; mappingConfidence: MappingConfidence;
} {
  const normalizedLabel = normaliseWords(rawLabel);
  const confirmed = aliasMappings.find((mapping) => normaliseWords(mapping.rawLabel) === normalizedLabel);
  const confirmedDefinition = confirmed ? METRICS.find((definition) => definition.metric === confirmed.metric) : undefined;
  if (confirmedDefinition) {
    return {
      metric: confirmedDefinition.metric,
      label: confirmedDefinition.label,
      panel: confirmedDefinition.panel,
      mappingConfidence: 'verified',
    };
  }
  let best: { definition: MetricDefinition; score: number } | null = null;
  for (const definition of METRICS) {
    if (!definitionMatchesContext(definition, rawLabel, panel)) continue;
    for (const alias of definition.aliases) {
      const normalizedAlias = normaliseWords(alias);
      const exact = normalizedLabel === normalizedAlias;
      const contained = normalizedLabel.includes(normalizedAlias);
      if (!exact && !contained) continue;
      const panelBonus = panel === definition.panel ? 30 : 0;
      const score = normalizedAlias.length + panelBonus + (exact ? 100 : 0);
      if (!best || score > best.score) best = { definition, score };
    }
  }
  if (best) {
    return {
      metric: best.definition.metric,
      label: best.definition.label,
      panel: best.definition.panel,
      mappingConfidence: 'alias',
    };
  }
  return {
    metric: 'unmapped_' + (panel || 'other') + '_' + slug(rawLabel),
    label: titleCaseLabel(rawLabel),
    panel: panel || 'other',
    mappingConfidence: 'unmapped',
  };
}

function explicitStatus(flag: string | null, rawValue: string, referenceText: string): RangeStatus | null {
  const normalizedFlag = normaliseWords(flag || '');
  if (/normal|negative|not detected|non reactive/.test(normalizedFlag)) return 'normal';
  if (/critical high|high|above/.test(normalizedFlag)) return 'high';
  if (/critical low|low|below/.test(normalizedFlag)) return 'low';
  if (/abnormal|positive|detected/.test(normalizedFlag)) return 'abnormal';
  const value = normaliseWords(rawValue);
  const reference = normaliseWords(referenceText);
  if (/^(not detected|negative|normal|non reactive|absent|nil|clear)$/.test(value)) return 'normal';
  if (/detected|positive|reactive|present/.test(value) && /not detected|negative|non reactive|absent/.test(reference)) return 'abnormal';
  return null;
}

function categoricalNumericStatus(value: number, referenceText: string): RangeStatus | null {
  const text = normaliseWords(referenceText);
  const rules: Array<{ pattern: RegExp; status: RangeStatus }> = [
    { pattern: /(?:normal|acceptable|optimal|desirable|sufficiency)\s+(?:less than|below|up to)?\s*(\d+(?:\.\d+)?)/, status: 'normal' },
    { pattern: /(?:normal|acceptable|optimal|desirable|sufficiency)\s+(?:greater than|above)\s*(\d+(?:\.\d+)?)/, status: 'normal' },
    { pattern: /(?:deficiency|low)\s+(?:less than|below)?\s*(\d+(?:\.\d+)?)/, status: 'low' },
    { pattern: /(?:abnormal|high|high risk)\s+(?:greater than|above)?\s*(\d+(?:\.\d+)?)/, status: 'high' },
  ];
  for (const rule of rules) {
    const match = text.match(rule.pattern);
    if (!match) continue;
    const bound = Number(match[1]);
    if (!Number.isFinite(bound)) continue;
    const phrase = match[0];
    const greater = /greater than|above|sufficiency|abnormal|high/.test(phrase);
    if ((greater && value >= bound) || (!greater && value <= bound)) return rule.status;
  }
  return null;
}

function recomputeResultStatus(result: LabResult): void {
  const reported = explicitStatus(result.flagText || null, result.rawValue, result.referenceText || '');
  const categorical = result.value === null ? null : categoricalNumericStatus(result.value, result.referenceText || '');
  const categoryWords = /deficien|insufficien|sufficien|acceptable|borderline|optimal|risk|desirable/i.test(result.referenceText || '');
  result.status = reported || categorical || (result.value !== null && !categoryWords
    ? valueStatus(result.value, result.referenceLow, result.referenceHigh)
    : 'unknown');
}

function parseResultLine(line: string, panel: LabPanel | null, aliasMappings: LabAliasMapping[]): LabResult | null {
  const compact = line.replace(/[\t ]+/g, ' ').trim();
  const match = compact.match(resultRowPattern);
  if (!match) return null;
  const rawLabel = match[1].replace(/[.:-]+$/, '').trim();
  if (!isPlausibleResultLabel(rawLabel)) return null;
  const rawValue = match[2].replace(/\s+/g, ' ').trim();
  let remainder = match[3].trim();
  const known = normalizeMetric(rawLabel, panel, aliasMappings);

  const flagMatch = remainder.match(/^(?:\*\*)?((?:critical\s+)?high|(?:critical\s+)?low|abnormal)(?:\*\*)?(?=\s|$)/i);
  const flagText = flagMatch?.[1] || null;
  if (flagMatch) remainder = remainder.slice(flagMatch[0].length).trim();

  const unitMatches = [...remainder.matchAll(new RegExp('(?:^|\\s)(' + DISPLAY_UNIT_PATTERN.source + ')(?=\\s|$)', 'ig'))];
  const unit = unitMatches.length > 0 ? unitMatches[unitMatches.length - 1][1] : null;
  const referenceText = (unit
    ? remainder.replace(new RegExp('(?:^|\\s)' + DISPLAY_UNIT_PATTERN.source + '(?=\\s|$)', 'ig'), ' ')
    : remainder).replace(/\s+/g, ' ').trim() || null;

  const scalarMatch = rawValue.match(new RegExp('^' + numberToken + '$'));
  const valueRangeMatch = rawValue.match(new RegExp('^(' + numberToken + ')\\s*(?:-|–|—|to)\\s*(' + numberToken + ')$', 'i'));
  const value = scalarMatch ? Number(rawValue.replace(',', '.')) : null;
  const rangeValueLow = valueRangeMatch ? Number(valueRangeMatch[1].replace(',', '.')) : null;
  const rangeValueHigh = valueRangeMatch ? Number(valueRangeMatch[2].replace(',', '.')) : null;
  const valueType: LabValueType = value !== null ? 'numeric' : valueRangeMatch ? 'range' : 'qualitative';

  const referenceRange = referenceText?.match(rangePattern) || null;
  let referenceLow = referenceRange ? Number(referenceRange[1].replace(',', '.')) : null;
  let referenceHigh = referenceRange ? Number(referenceRange[2].replace(',', '.')) : null;
  const ceiling = referenceText?.match(new RegExp('(?:<\\s*(?:or\\s*)?=?|up\\s*to|upto|less\\s+than)\\s*(' + numberToken + ')', 'i'));
  const floor = referenceText?.match(new RegExp('(?:>\\s*(?:or\\s*)?=?|greater\\s+than)\\s*(' + numberToken + ')', 'i'));
  if (!referenceRange && ceiling) referenceHigh = Number(ceiling[1].replace(',', '.'));
  if (!referenceRange && floor) referenceLow = Number(floor[1].replace(',', '.'));
  if (!Number.isFinite(referenceLow as number)) referenceLow = null;
  if (!Number.isFinite(referenceHigh as number)) referenceHigh = null;

  if (known.mappingConfidence === 'unmapped') {
    const letters = rawLabel.replace(/[^A-Za-z]/g, '');
    const capitals = letters.replace(/[^A-Z]/g, '');
    const labelLooksLikeLabRow = letters.length > 0 && capitals.length / letters.length >= 0.6;
    const hasStructuredEvidence = !!unit || !!flagText || (!!referenceText && /\d|<|>|negative|normal|not detected/i.test(referenceText));
    const hasStrongColumnEvidence = !!unit && !!referenceText && /\d|<|>/i.test(referenceText);
    if ((!labelLooksLikeLabRow && !hasStrongColumnEvidence) || !hasStructuredEvidence) return null;
  }

  const result: LabResult = {
    ...known,
    rawLabel,
    value,
    valueType,
    rawValue,
    rangeValueLow,
    rangeValueHigh,
    unit,
    unitCode: normalizeLabUnit(unit),
    referenceLow,
    referenceHigh,
    referenceText,
    flagText,
    status: 'unknown',
  };
  recomputeResultStatus(result);
  return result;
}

function appendResultContinuation(result: LabResult, line: string): boolean {
  const compact = line.replace(/[\t ]+/g, ' ').trim();
  const unitOnly = compact.match(new RegExp('^(' + DISPLAY_UNIT_PATTERN.source + ')$', 'i'));
  if (unitOnly && !result.unit) {
    result.unit = unitOnly[1];
    result.unitCode = normalizeLabUnit(result.unit);
    return true;
  }
  const categoryContinuation = compact.length <= 140 && /\d/.test(compact)
    && /^(?:acceptable|borderline|normal|abnormal|high(?:\s+risk)?|low(?:\s+risk)?|very\s+high|near\s+optimal|optimal|desirable|deficiency|insufficiency|sufficiency)\b/i.test(compact);
  const wrappedNumberContinuation = /^\d/.test(compact) && /[-–—]\s*$/.test(result.referenceText || '');
  if (categoryContinuation || wrappedNumberContinuation) {
    result.referenceText = [result.referenceText, compact].filter(Boolean).join(' ');
    recomputeResultStatus(result);
    return true;
  }
  return false;
}

/** Extracts result rows first, then conservatively normalizes lab-specific labels. */
export function parseBloodResults(ocrText = '', aliasMappings: LabAliasMapping[] = []): LabResult[] {
  const results = new Map<string, LabResult>();
  const lines = ocrText.replace(/\r/g, '\n').split(/\n+/);
  let panel: LabPanel | null = null;
  let pending: LabResult | null = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/[\t ]+/g, ' ').trim();
    if (!line) continue;
    panel = panelFromHeading(line, panel);
    const parsed = parseResultLine(line, panel, aliasMappings);
    if (!parsed) {
      if (pending && appendResultContinuation(pending, line)) continue;
      pending = null;
      continue;
    }
    const existing = results.get(parsed.metric);
    const quality = (item: LabResult) => (item.mappingConfidence === 'unmapped' ? 0 : 10)
      + (item.unit ? 2 : 0) + (item.referenceText ? 2 : 0) + (item.flagText ? 1 : 0);
    if (!existing || quality(parsed) >= quality(existing)) {
      results.set(parsed.metric, parsed);
      pending = parsed;
    } else {
      pending = existing;
    }
  }
  return [...results.values()];
}

export function buildBloodReportSummary(inputs: BloodReportInput[]) {
  const reports: BloodReport[] = inputs
    .map((input) => ({
      ...input,
      useManualResults: !!input.useManualResults,
      results: resolveReportResults(input),
    }))
    .filter((report) => report.results.length > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const metrics = new Map<string, MetricComparison>();
  for (const report of reports) {
    for (const result of report.results) {
      const existing = metrics.get(result.metric) || {
        metric: result.metric,
        label: result.label,
        panel: result.panel,
        unit: result.unit,
        results: [],
        change: null,
        changePercent: null,
        direction: 'not-comparable' as const,
      };
      existing.results.push({
        ...result,
        reportId: report.id,
        date: report.date,
        source: report.source,
        documentPath: report.documentPath,
      });
      if (!existing.unit && result.unit) existing.unit = result.unit;
      metrics.set(result.metric, existing);
    }
  }

  const comparisons = [...metrics.values()].map((comparison) => {
    comparison.results.sort((a, b) => a.date.getTime() - b.date.getTime());
    const endpoints = pickTrendEndpoints(comparison.results);
    if (endpoints) {
      const { oldest, newest } = endpoints;
      const change = newest.value - oldest.value;
      comparison.change = change;
      comparison.changePercent = oldest.value === 0 ? null : (change / Math.abs(oldest.value)) * 100;
      comparison.direction = Math.abs(change) < 0.000001 ? 'unchanged' : change > 0 ? 'increased' : 'decreased';
      comparison.unit = newest.unit || oldest.unit || comparison.unit;
    }
    return comparison;
  }).sort((a, b) => a.label.localeCompare(b.label));

  const panels: PanelSummary[] = PANEL_ORDER
    .map((panel) => ({
      panel,
      label: PANEL_LABELS[panel],
      comparisons: comparisons.filter((item) => item.panel === panel),
    }))
    .filter((panel) => panel.comparisons.length > 0);

  const keyFindings: KeyFinding[] = [];
  for (const comparison of comparisons) {
    const latest = comparison.results[comparison.results.length - 1];
    const numericResults = comparison.results.filter(
      (result): result is typeof result & { value: number } => result.value !== null,
    );
    const unit = latest.unit ? ` ${latest.unit}` : '';
    const referenceSummary = latest.referenceText
      ? `${latest.referenceText.slice(0, 140)}${latest.referenceText.length > 140 ? '…' : ''}`
      : '';
    if (latest.status === 'high' || latest.status === 'low' || latest.status === 'abnormal') {
      const boundary = latest.status === 'high'
        ? (latest.referenceHigh !== null ? `above ${latest.referenceHigh}` : 'flagged high by the laboratory')
        : latest.status === 'low'
          ? (latest.referenceLow !== null ? `below ${latest.referenceLow}` : 'flagged low by the laboratory')
          : 'flagged abnormal by the laboratory';
      keyFindings.push({
        severity: 'attention',
        metric: comparison.metric,
        text: `${comparison.label} was ${formatLabResultValue(latest)} on ${formatDate(latest.date)}, ${boundary}${referenceSummary ? ` (reference: ${referenceSummary})` : ''}.`,
      });
    }
    if (
      comparison.direction !== 'not-comparable'
      && comparison.direction !== 'unchanged'
      && comparison.changePercent !== null
      && Math.abs(comparison.changePercent) >= 5
    ) {
      keyFindings.push({
        severity: 'change',
        metric: comparison.metric,
        text: `${comparison.label} ${comparison.direction} from ${numericResults[0].value}${unit} on ${formatDate(numericResults[0].date)} to ${numericResults[numericResults.length - 1].value}${unit} on ${formatDate(numericResults[numericResults.length - 1].date)}.`,
      });
    }
  }

  if (keyFindings.length === 0 && reports.length > 0) {
    keyFindings.push({
      severity: 'information',
      text: 'No values outside a stated laboratory range or material changes were detected in the extracted results.',
    });
  }

  return { reports, comparisons, panels, keyFindings };
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export { PANEL_LABELS, PANEL_ORDER };
