export const DEFAULT_TAGS = [
  'prescription',
  'lab_report',
  'scan_result',
  'discharge_summary',
  'consultation',
  'medication',
  'symptom',
  'vital_signs',
] as const;

export const RECORD_TYPES = [
  'openEHR-EHR-OBSERVATION.lab_test.v1',
  'openEHR-EHR-OBSERVATION.vital_signs.v2',
  'openEHR-EHR-EVALUATION.problem_diagnosis.v1',
  'openEHR-EHR-INSTRUCTION.medication_order.v1',
  'openEHR-EHR-ACTION.medication.v1',
  'openEHR-EHR-EVALUATION.clinical_synopsis.v1',
] as const;

export const SUPPORTED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'heic', 'heif'] as const;
export const SUPPORTED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx'] as const;

