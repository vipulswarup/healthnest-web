import { toCalendarDay } from '@/lib/dates/calendar-date';

/**
 * Prefer day-first (DD/MM/YYYY) when slash dates are ambiguous — Indian labs.
 * Unambiguous ISO and clear day>12 cases are kept as-is.
 */
export function parseDocumentDate(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string' && !(raw instanceof Date)) return null;

  const iso = toCalendarDay(raw);
  if (typeof raw !== 'string') return iso || null;

  const text = raw.trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slash = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const year = Number(slash[3]);
    if (!year || a < 1 || b < 1) return null;
    // Day-first when first part looks like a day, or second is >12 (must be day).
    let day: number;
    let month: number;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous: assume DD/MM (India).
      day = a;
      month = b;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return iso || null;
}
