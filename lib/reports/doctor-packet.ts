import type { KeyFinding, MetricComparison } from '@/lib/reports/blood-summary';
import { isoDateFromUnknown } from '@/lib/vitals/growth';

export const DOCTOR_PACKET_HIGHLIGHT_LIMIT = 5;
export const DOCTOR_PACKET_TREND_LIMIT = 8;

const PACKET_TREND_PRIORITY = [
  'hemoglobin',
  'hba1c',
  'fasting_glucose',
  'creatinine',
  'egfr',
  'alt',
  'ast',
  'alp',
  'bilirubin_total',
  'ldl',
  'hdl',
  'triglycerides',
  'total_cholesterol',
  'tsh',
  'vitamin_d',
  'ferritin',
  'platelets',
  'total_wbc',
];

export type LabTrend = {
  metric: string;
  label: string;
  line: string;
  values: number[];
  direction: MetricComparison['direction'];
};

type MedicationLike = {
  originalBrandName: string;
  dosage: string;
  frequency: string;
  route: string;
  indication: string;
  composition: {
    formulation: string;
    ingredients: Array<{ canonicalInn: string; strength: string; strengthUnit: string }>;
  };
};

export function medicationLine(medication: MedicationLike) {
  const generic = medication.composition.ingredients
    .map((ingredient) => `${ingredient.canonicalInn} ${ingredient.strength} ${ingredient.strengthUnit}`.trim())
    .filter(Boolean)
    .join(' + ');
  const name = generic || medication.originalBrandName;
  const form = medication.composition.formulation ? ` · ${medication.composition.formulation}` : '';
  return `${name}${form} — ${medication.dosage}, ${medication.frequency}, ${medication.route}`;
}

export function medicationSummaryLine(medication: MedicationLike) {
  return `${medication.originalBrandName} — ${medication.frequency}`;
}

export function medicationDetailLine(medication: MedicationLike) {
  return medicationLine(medication);
}

export function conditionLines(medications: MedicationLike[]) {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const medication of medications) {
    const indication = medication.indication.trim();
    if (!indication) continue;
    const key = indication.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(indication);
    if (lines.length >= 6) break;
  }
  return lines;
}

export function pickLabHighlights(findings: KeyFinding[]) {
  const attention = findings.filter((finding) => finding.severity === 'attention');
  const change = findings.filter((finding) => finding.severity === 'change');
  const picked: KeyFinding[] = [];
  const seen = new Set<string>();
  for (const finding of [...attention, ...change]) {
    const key = finding.metric || finding.text;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(finding);
    if (picked.length >= DOCTOR_PACKET_HIGHLIGHT_LIMIT) break;
  }
  if (picked.length === 0) {
    const info = findings.find((finding) => finding.severity === 'information');
    if (info) return [info];
  }
  return picked;
}

export type LatestLabCandidate = {
  id: string;
  date: Date;
  source: string;
  resultCount: number;
  ocrChars: number;
  documentPath?: string;
};

export function formatPacketDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function labPacketLines(options: {
  findings: KeyFinding[];
  latestCandidate: LatestLabCandidate | null;
}) {
  const highlights = pickLabHighlights(options.findings).map((finding) => finding.text);
  const latest = options.latestCandidate;
  if (!latest) return highlights;
  const latestLabel = `${formatPacketDate(latest.date)} · ${latest.source}`;
  if (latest.resultCount === 0) {
    return [
      `Latest lab (${latestLabel}) is attached, but values could not be read yet.`,
      ...highlights.map((line) => `Earlier result: ${line}`),
    ];
  }
  return highlights;
}

export function labTrendLines(
  comparisons: MetricComparison[],
  limit = DOCTOR_PACKET_TREND_LIMIT,
): LabTrend[] {
  const rows: Array<LabTrend & { rank: number; absPercent: number }> = [];
  for (const comparison of comparisons) {
    const numeric = comparison.results.filter(
      (result): result is typeof result & { value: number } => result.value !== null,
    );
    if (numeric.length < 2) continue;
    const oldest = numeric[0];
    const newest = numeric[numeric.length - 1];
    const unit = newest.unit || comparison.unit;
    const unitBit = unit ? ` ${unit}` : '';
    const pct = comparison.changePercent;
    const changeBit =
      comparison.direction === 'increased' || comparison.direction === 'decreased'
        ? `, ${comparison.direction === 'increased' ? 'up' : 'down'}${pct !== null ? ` ${Math.round(Math.abs(pct))}%` : ''}`
        : '';
    const line = `${comparison.label} ${oldest.value}${unitBit} → ${newest.value}${unitBit} (${formatPacketDate(oldest.date)} → ${formatPacketDate(newest.date)}${changeBit})`;
    const priorityIndex = PACKET_TREND_PRIORITY.indexOf(comparison.metric);
    const globulinBoost = /globulin/i.test(comparison.label) || /globulin/i.test(comparison.metric);
    const rank = priorityIndex >= 0 ? priorityIndex : globulinBoost ? 8.5 : 100;
    const absPercent = pct === null ? 0 : Math.abs(pct);
    if (rank >= 100 && absPercent < 5) continue;
    rows.push({
      metric: comparison.metric,
      label: comparison.label,
      line,
      values: numeric.map((item) => item.value),
      direction: comparison.direction,
      rank,
      absPercent,
    });
  }
  rows.sort((a, b) => a.rank - b.rank || b.absPercent - a.absPercent);
  return rows.slice(0, limit).map((row) => ({
    metric: row.metric,
    label: row.label,
    line: row.line,
    values: row.values,
    direction: row.direction,
  }));
}

export function ageFromDateOfBirth(value: string | Date | null | undefined) {
  const birthIso = isoDateFromUnknown(value);
  const todayIso = isoDateFromUnknown(new Date());
  if (!birthIso || !todayIso) return null;
  const [birthYear, birthMonth, birthDay] = birthIso.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = todayIso.split('-').map(Number);
  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function doctorPacketWhatsAppText(packet: {
  origin: string;
  patientId: string;
  name: string;
  identityLine: string;
  conditions: string[];
  medicines: string[];
  labHighlights: string[];
  labTrends?: string[];
  bloodPressure: string[];
  growth: string[];
  vaccinations: string[];
  visitNotes: string[];
  documents: Array<{ label: string; href: string }>;
}) {
  const lines = [
    `SanoVault — For the Doctor`,
    packet.name,
    packet.identityLine,
    '',
    'Conditions',
    ...(packet.conditions.length ? packet.conditions.map((line) => `- ${line}`) : ['- None recorded']),
    '',
    'Current Medicines',
    ...(packet.medicines.length ? packet.medicines.map((line) => `- ${line}`) : ['- None recorded']),
    '',
    'Lab Highlights',
    ...(packet.labHighlights.length ? packet.labHighlights.map((line) => `- ${line}`) : ['- No recent lab highlights']),
    '',
    'Lab Trends',
    ...(packet.labTrends && packet.labTrends.length
      ? packet.labTrends.map((line) => `- ${line}`)
      : ['- Need two lab dates for a trend']),
    '',
    'Blood Pressure',
    ...(packet.bloodPressure.length ? packet.bloodPressure.map((line) => `- ${line}`) : ['- Not logged in SanoVault yet']),
    '',
    'Height & Weight',
    ...(packet.growth.length ? packet.growth.map((line) => `- ${line}`) : ['- Not logged in SanoVault yet']),
    '',
    'Vaccinations',
    ...(packet.vaccinations.length ? packet.vaccinations.map((line) => `- ${line}`) : ['- None recorded']),
  ];
  if (packet.visitNotes.length) {
    lines.push('', 'Visit Notes', ...packet.visitNotes.map((line) => `- ${line}`));
  }
  if (packet.documents.length) {
    lines.push('', 'Reports');
    for (const document of packet.documents) {
      lines.push(`- ${document.label}: ${document.href}`);
    }
  }
  lines.push('', `Open packet: ${packet.origin.replace(/\/$/, '')}/for-the-doctor?patientId=${packet.patientId}`);
  return lines.join('\n');
}
