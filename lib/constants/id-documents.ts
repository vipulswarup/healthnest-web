export const ID_DOCUMENT_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar' },
  { value: 'PAN', label: 'PAN card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'DRIVING_LICENCE', label: 'Driving licence' },
  { value: 'STATE_ID', label: 'State ID / REAL ID' },
  { value: 'SSN_CARD', label: 'Social Security card' },
  { value: 'GREEN_CARD', label: 'Green card' },
  { value: 'EAD', label: 'Employment authorization' },
  { value: 'BRP', label: 'UK biometric residence permit' },
  { value: 'NATIONAL_INSURANCE', label: 'UK National Insurance' },
  { value: 'OTHER', label: 'Other ID' },
] as const;

export const ID_DOCUMENT_TAGS = [
  'aadhaar',
  'pan_card',
  'passport',
  'voter_id',
  'driving_licence',
  'ssn_card',
  'green_card',
  'brp',
] as const;

const ID_TYPE_ALIASES: Array<{ test: RegExp; value: string }> = [
  { test: /\baadhaar\b|\baadhar\b|\buidai\b/, value: 'AADHAAR' },
  { test: /\bpan\b/, value: 'PAN' },
  { test: /\bpassport\b/, value: 'PASSPORT' },
  { test: /\bvoter\b|\bepic\b/, value: 'VOTER_ID' },
  { test: /\bdriving\b|\bdriver'?s?\s+licen/, value: 'DRIVING_LICENCE' },
  { test: /\breal\s*id\b|\bstate\s+id\b/, value: 'STATE_ID' },
  { test: /\bssn\b|\bsocial\s+security\b/, value: 'SSN_CARD' },
  { test: /\bgreen\s+card\b|\bpermanent\s+resident\b/, value: 'GREEN_CARD' },
  { test: /\bead\b|\bemployment\s+authorization\b/, value: 'EAD' },
  { test: /\bbrp\b|\bbiometric\s+residence\b/, value: 'BRP' },
  { test: /\bnational\s+insurance\b|\bni\s+(card|number)\b/, value: 'NATIONAL_INSURANCE' },
];

export function resolveIdType(raw?: string | null, tags: string[] = []): string {
  const blob = `${raw || ''} ${tags.join(' ')}`.toLowerCase();
  if (!blob.trim()) return '';
  const hit = ID_TYPE_ALIASES.find((alias) => alias.test.test(blob));
  return hit?.value || 'OTHER';
}

export function idTypeLabel(code: string): string {
  return ID_DOCUMENT_TYPES.find((item) => item.value === code)?.label || code;
}
