/**
 * Fallback labels aligned with health_record_categories seed data.
 * Prefer DB categories via getAllCategories() for AI and UI.
 */

export const RECORD_TYPE_LABELS: Record<string, string> = {
  LAB_REPORT: 'Lab Report',
  PRESCRIPTION: 'Prescription',
  CONSULTATION_NOTE: 'Consultation Note',
  IMAGING_REPORT: 'Imaging Report',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  VACCINATION_RECORD: 'Vaccination Record',
  VITAL_SIGNS: 'Vital Signs',
  ID_DOCUMENT: 'ID Document',
  OTHER: 'Other',
};

export function humanizeLabel(value: string) {
  const key = value.trim();
  if (!key) return '';
  return RECORD_TYPE_LABELS[key] || RECORD_TYPE_LABELS[key.toUpperCase()] || key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getRecordTypeLabel(recordType: string) {
  return humanizeLabel(recordType);
}

export function getRecordTypeOptions() {
  return Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}
