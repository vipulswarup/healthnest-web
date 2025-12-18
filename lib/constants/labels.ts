/**
 * User-friendly labels for technical terms
 * This file can be extended to support multiple languages in the future
 */

export const RECORD_TYPE_LABELS: Record<string, string> = {
  'openEHR-EHR-OBSERVATION.lab_test.v1': 'Pathology Test',
  'openEHR-EHR-OBSERVATION.imaging_exam_result.v1': 'Radiology Scan',
  'openEHR-EHR-OBSERVATION.vital_signs.v2': 'Vital Signs',
  'openEHR-EHR-EVALUATION.problem_diagnosis.v1': 'Diagnosis',
  'openEHR-EHR-INSTRUCTION.medication_order.v1': 'Medication Order',
  'openEHR-EHR-ACTION.medication.v1': 'Medication',
  'openEHR-EHR-EVALUATION.clinical_synopsis.v1': 'Clinical Synopsis',
};

/**
 * Get user-friendly label for a record type
 * Falls back to the technical name if no label is found
 */
export function getRecordTypeLabel(recordType: string): string {
  return RECORD_TYPE_LABELS[recordType] || recordType;
}

/**
 * Get user-friendly labels for record types (for dropdowns/selects)
 * Returns array of { value, label } pairs
 */
export function getRecordTypeOptions() {
  return Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

