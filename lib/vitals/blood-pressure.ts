export const BP_TIME_ZONE = 'Asia/Kolkata';
export const BP_LOOKBACK_DAYS = 7;

export type BpPeriod = 'morning' | 'afternoon' | 'evening' | 'other';

export type BloodPressureReading = {
  id: string;
  patientId: string;
  recordedAt: string;
  period: BpPeriod;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  calendarDate: string;
  source: 'sanovault' | 'healthkit' | 'health_connect';
  externalId: string | null;
  vaultOwned: boolean;
};

export type BpDaySlot = {
  date: string;
  label: string;
  morning: BloodPressureReading | null;
  afternoon: BloodPressureReading | null;
  evening: BloodPressureReading | null;
};

const SLOT_PERIODS = ['morning', 'afternoon', 'evening'] as const;

export function periodLabel(period: BpPeriod) {
  if (period === 'morning') return 'Morning';
  if (period === 'afternoon') return 'Afternoon';
  if (period === 'evening') return 'Evening';
  return 'Night';
}

export function inferPeriod(at = new Date()): BpPeriod {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: BP_TIME_ZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(at).find((part) => part.type === 'hour')?.value || '0',
  );
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17) return 'evening';
  return 'other';
}

export function calendarDateInIndia(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
}

export function readingLine(reading: BloodPressureReading) {
  const pulse = reading.pulse ? ` · pulse ${reading.pulse}` : '';
  return `${formatCalendarDate(reading.calendarDate)} ${periodLabel(reading.period).toLowerCase()} ${reading.systolic}/${reading.diastolic}${pulse}`;
}

export function lastWeekDates(today = new Date()): string[] {
  const dates: string[] = [];
  const start = calendarDateInIndia(today);
  const [year, month, day] = start.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (let offset = BP_LOOKBACK_DAYS - 1; offset >= 0; offset -= 1) {
    const next = new Date(cursor);
    next.setUTCDate(cursor.getUTCDate() - offset);
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, '0');
    const d = String(next.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
  }
  return dates;
}

export function groupReadingsByDay(readings: BloodPressureReading[], today = new Date()): BpDaySlot[] {
  const latest = new Map<string, BloodPressureReading>();
  for (const reading of readings) {
    const key = `${reading.calendarDate}|${reading.period}`;
    const existing = latest.get(key);
    if (!existing || existing.recordedAt < reading.recordedAt) latest.set(key, reading);
  }

  return lastWeekDates(today).map((date) => ({
    date,
    label: formatCalendarDate(date),
    morning: latest.get(`${date}|morning`) || null,
    afternoon: latest.get(`${date}|afternoon`) || null,
    evening: latest.get(`${date}|evening`) || null,
  }));
}

export function packetBpLines(days: BpDaySlot[]) {
  const lines: string[] = [];
  for (const day of days) {
    for (const period of SLOT_PERIODS) {
      const reading = day[period];
      if (reading) lines.push(readingLine(reading));
    }
  }
  return lines;
}

export function toBloodPressureReading(row: Record<string, unknown>): BloodPressureReading {
  const recordedAt = new Date(String(row.recorded_at));
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    recordedAt: recordedAt.toISOString(),
    period: row.period as BpPeriod,
    systolic: Number(row.systolic),
    diastolic: Number(row.diastolic),
    pulse: row.pulse === null || row.pulse === undefined ? null : Number(row.pulse),
    calendarDate: calendarDateInIndia(recordedAt),
    source: (row.source as BloodPressureReading['source']) || 'sanovault',
    externalId: row.external_id ? String(row.external_id) : null,
    vaultOwned: row.vault_owned !== false,
  };
}
