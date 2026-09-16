export type GrowthMeasurement = {
  id: string;
  patientId: string;
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  headCircumCm: number | null;
  notes: string;
  calendarDate: string;
};

export function formatCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

export function calendarDateFromInstant(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

const ISO_DAY = /(\d{4})-(\d{2})-(\d{2})/;

export function isoDateFromUnknown(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return calendarDateFromInstant(value);
  }
  const match = String(value).match(ISO_DAY);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return calendarDateFromInstant(parsed);
}

function partsFromIsoDay(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function ageAtDate(dateOfBirth: string | Date | null | undefined, at: Date): string | null {
  const birthIso = isoDateFromUnknown(dateOfBirth);
  const atIso = isoDateFromUnknown(at);
  if (!birthIso || !atIso) return null;
  const birth = partsFromIsoDay(birthIso);
  const when = partsFromIsoDay(atIso);
  let years = when.year - birth.year;
  let months = when.month - birth.month;
  if (when.day < birth.day) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  if (years === 0) return months <= 1 ? `${Math.max(0, months)} mo` : `${months} mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

export function bmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

export function measurementLine(
  measurement: GrowthMeasurement,
  dateOfBirth?: string | Date | null,
  options?: { includeAge?: boolean },
) {
  const when = formatCalendarDate(measurement.calendarDate);
  const parts: string[] = [];
  if (measurement.heightCm !== null) parts.push(`${measurement.heightCm} cm`);
  if (measurement.weightKg !== null) parts.push(`${measurement.weightKg} kg`);
  if (measurement.headCircumCm !== null) parts.push(`head ${measurement.headCircumCm} cm`);
  const includeAge = options?.includeAge !== false;
  const age = includeAge && dateOfBirth ? ageAtDate(dateOfBirth, new Date(measurement.measuredAt)) : null;
  const bmiValue = bmi(measurement.heightCm, measurement.weightKg);
  const suffix = [
    age ? `age ${age}` : '',
    bmiValue ? `BMI ${bmiValue}` : '',
  ].filter(Boolean).join(' · ');
  const body = parts.length ? parts.join(' · ') : 'Measurement recorded';
  return suffix ? `${when} · ${body} · ${suffix}` : `${when} · ${body}`;
}

export function packetGrowthLines(
  measurements: GrowthMeasurement[],
  dateOfBirth?: string | Date | null,
  limit = 6,
) {
  const ageYears = dateOfBirth ? ageAtDate(dateOfBirth, new Date()) : null;
  const years = ageYears ? Number.parseInt(ageYears, 10) : null;
  const includeAge = years === null || Number.isNaN(years) || years < 18;
  return measurements.slice(0, limit).map((measurement) => measurementLine(measurement, dateOfBirth, { includeAge }));
}

export function toGrowthMeasurement(row: Record<string, unknown>): GrowthMeasurement {
  const measuredAt = new Date(String(row.measured_at));
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    measuredAt: measuredAt.toISOString(),
    heightCm: row.height_cm === null || row.height_cm === undefined ? null : Number(row.height_cm),
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Number(row.weight_kg),
    headCircumCm: row.head_circum_cm === null || row.head_circum_cm === undefined ? null : Number(row.head_circum_cm),
    notes: String(row.notes || ''),
    calendarDate: calendarDateFromInstant(measuredAt),
  };
}
