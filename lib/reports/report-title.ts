import { RECORD_TYPE_LABELS } from '@/lib/constants/labels';
import { toCalendarDay } from '@/lib/dates/calendar-date';

const NOISE_TAGS = new Set([
  'needs_review', 'folder_check', 'whatsapp', 'mobile_share', 'lab_report', 'imaging',
  'imaging_report', 'radiology', 'scan_result', 'other', 'unknown', 'unreadable',
  'corrupted_file', 'binary_data', 'prescription', 'consultation', 'medication',
]);

const TEST_TYPE_BY_TAG: Record<string, string> = {
  neuro_diagnostic: 'NeuroDiagnostic',
  stress_test: 'StressTest',
  exercise_echo: 'StressTest',
  ct_scan: 'CtScan',
  ct: 'CtScan',
  mri: 'Mri',
  pet_scan: 'PetScan',
  xray: 'Xray',
  x_ray: 'Xray',
  ultrasound: 'Ultrasound',
  usg: 'Ultrasound',
  emg: 'Emg',
  nerve_conduction: 'NerveConduction',
  ncv: 'NerveConduction',
  eeg: 'Eeg',
  ecg: 'Ecg',
  ekg: 'Ecg',
  echo: 'Echo',
  echocardiogram: 'Echo',
  colonoscopy: 'Colonoscopy',
  endoscopy: 'Endoscopy',
  biopsy: 'Biopsy',
  mammogram: 'Mammogram',
  dexa: 'Dexa',
  cbc: 'Cbc',
  blood_test: 'BloodTest',
  pathology: 'Pathology',
  vaccination: 'Vaccination',
};

const TEST_TYPE_PRIORITY = [
  'neuro_diagnostic', 'stress_test', 'ct_scan', 'ct', 'mri', 'pet_scan', 'ultrasound', 'usg',
  'xray', 'x_ray', 'emg', 'nerve_conduction', 'ncv', 'eeg', 'ecg', 'ekg', 'exercise_echo',
  'echo', 'echocardiogram', 'colonoscopy', 'endoscopy', 'biopsy', 'mammogram', 'dexa',
  'cbc', 'blood_test', 'pathology', 'vaccination',
];

const ORGAN_BY_TAG: Record<string, string> = {
  heart: 'Heart',
  cardiac: 'Heart',
  cardiology: 'Heart',
  brain: 'Brain',
  nerve: 'Nerve',
  nerves: 'Nerve',
  neuro: 'Nerve',
  neurology: 'Nerve',
  sinus: 'Sinuses',
  sinuses: 'Sinuses',
  paranasal_sinuses: 'Sinuses',
  lung: 'Lungs',
  lungs: 'Lungs',
  chest: 'Chest',
  pulmonary: 'Lungs',
  liver: 'Liver',
  hepatic: 'Liver',
  kidney: 'Kidney',
  renal: 'Kidney',
  thyroid: 'Thyroid',
  blood: 'Blood',
  eye: 'Eye',
  retina: 'Eye',
  spine: 'Spine',
  abdomen: 'Abdomen',
  knee: 'Knee',
  hip: 'Hip',
  shoulder: 'Shoulder',
  breast: 'Breast',
  prostate: 'Prostate',
  skin: 'Skin',
  bone: 'Bone',
};

const ORGAN_PRIORITY = [
  'heart', 'brain', 'nerve', 'nerves', 'sinus', 'sinuses', 'paranasal_sinuses', 'lung', 'lungs',
  'liver', 'kidney', 'thyroid', 'eye', 'retina', 'spine', 'abdomen', 'knee', 'hip', 'shoulder',
  'breast', 'prostate', 'chest', 'blood', 'bone', 'skin', 'cardiac', 'cardiology', 'neuro',
  'neurology', 'hepatic', 'renal', 'pulmonary',
];

const RECORD_TYPE_TOKEN: Record<string, string> = {
  LAB_REPORT: 'LabReport',
  IMAGING_REPORT: 'Imaging',
  PRESCRIPTION: 'Prescription',
  CONSULTATION_NOTE: 'Consult',
  DISCHARGE_SUMMARY: 'Discharge',
  VACCINATION_RECORD: 'Vaccination',
  VITAL_SIGNS: 'Vitals',
  ID_DOCUMENT: 'Id',
  OTHER: 'Report',
};

const ORGAN_FROM_TEST: Record<string, string> = {
  NeuroDiagnostic: 'Nerve',
  Emg: 'Nerve',
  NerveConduction: 'Nerve',
  StressTest: 'Heart',
  Echo: 'Heart',
  Ecg: 'Heart',
  Mammogram: 'Breast',
};

export type ReportTitleInput = {
  documentDate?: unknown;
  createdAt?: unknown;
  recordType?: string;
  tags?: unknown;
  data?: Record<string, unknown> | null;
};

function isoDay(value: unknown): string | undefined {
  return toCalendarDay(value);
}

function tagList(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag || '').trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
}

const ACRONYMS = new Set(['mri', 'emg', 'ecg', 'eeg', 'cbc', 'pet', 'ncv', 'usg', 'ekg']);

export function toPascalToken(value: string): string {
  return value
    .replace(/['’]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'ct') return 'Ct';
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join('');
}

function pickMapped(tags: string[], map: Record<string, string>, priority: string[]): string | undefined {
  const set = new Set(tags);
  for (const key of priority) {
    if (set.has(key) && map[key]) return map[key];
  }
  for (const tag of tags) {
    if (map[tag]) return map[tag];
  }
  return undefined;
}

function stringField(data: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = data?.[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function fallbackTestType(recordType: string | undefined, tags: string[]): string {
  const leftover = tags.find((tag) => !NOISE_TAGS.has(tag) && !/^\d{4}$/.test(tag) && !ORGAN_BY_TAG[tag] && !TEST_TYPE_BY_TAG[tag]);
  if (leftover) return toPascalToken(leftover);
  const code = (recordType || 'OTHER').toUpperCase();
  return RECORD_TYPE_TOKEN[code] || toPascalToken(RECORD_TYPE_LABELS[code] || code);
}

export function reportTitle(input: ReportTitleInput): string {
  const data = input.data || {};
  const override = stringField(data, 'titleOverride');
  if (override) return override;

  const date = isoDay(input.documentDate) || isoDay(input.createdAt) || 'undated';
  const tags = tagList(input.tags);
  const recordType = String(input.recordType || 'OTHER');
  const customType = stringField(data, 'customTypeLabel');

  if (recordType.toUpperCase() === 'ID_DOCUMENT') {
    const idType = stringField(data, 'idType');
    const parts = [date, idType ? toPascalToken(idType) : 'Id'];
    return parts.join('-');
  }

  if (recordType.toUpperCase() === 'OTHER' && customType) {
    return [date, toPascalToken(customType)].filter(Boolean).join('-');
  }

  const multiTests = Array.isArray(data.testTypes)
    ? data.testTypes.map((item) => toPascalToken(String(item || ''))).filter(Boolean).slice(0, 5)
    : [];
  if (multiTests.length > 1) {
    return [date, multiTests.join(',')].filter(Boolean).join('-');
  }

  const testType = multiTests[0]
    || toPascalToken(stringField(data, 'testType') || '')
    || pickMapped(tags, TEST_TYPE_BY_TAG, TEST_TYPE_PRIORITY)
    || fallbackTestType(recordType, tags);
  const organ = toPascalToken(stringField(data, 'bodyPart') || '')
    || pickMapped(tags, ORGAN_BY_TAG, ORGAN_PRIORITY)
    || ORGAN_FROM_TEST[testType];

  return [date, testType, organ].filter(Boolean).join('-');
}

function extensionOf(originalFileName?: string, mimeType?: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(originalFileName || '');
  if (match) return `.${match[1].toLowerCase()}`;
  const mime = (mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime.startsWith('image/')) return '.jpg';
  if (mime.includes('word')) return '.docx';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '.xlsx';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '.pptx';
  return '.pdf';
}

export function safeDownloadFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 120) || 'document';
}

export function reportFileName(input: ReportTitleInput & { originalFileName?: string; mimeType?: string }): string {
  return safeDownloadFileName(`${reportTitle(input)}${extensionOf(input.originalFileName, input.mimeType)}`);
}
