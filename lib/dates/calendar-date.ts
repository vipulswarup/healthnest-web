/** Calendar-day helpers: never shift YYYY-MM-DD across timezones. */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function toCalendarDay(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  const match = text.match(DAY_RE);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return undefined;
}

export function formatCalendarDay(
  value: unknown,
  locale = 'en-GB',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  const day = toCalendarDay(value);
  if (!day) return value == null || value === '' ? '' : String(value);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    ...options,
    timeZone: 'UTC',
  });
}

export function isCalendarDay(value: string): boolean {
  return DAY_RE.test(value) && value.length >= 10;
}
