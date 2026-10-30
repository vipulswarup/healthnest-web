import { z } from 'zod';

const startDateString = z
  .string()
  .min(1, 'Start date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the start date as YYYY-MM-DD');

/** Required start date for create. Empty/missing becomes '' so the message is clear. */
export const medicationStartDateSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return '';
}, startDateString);

/** Optional start date for update — omit/blank leaves the existing value. */
export const optionalMedicationStartDateSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return undefined;
}, startDateString.optional());

export const medicationEndDateSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  },
  z.union([
    z.null(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the end date as YYYY-MM-DD'),
  ]).optional(),
);

export function withMedicationDateOrder<T extends z.ZodType>(schema: T) {
  return schema.superRefine((value, context) => {
    if (!value || typeof value !== 'object') return;
    const record = value as { startDate?: unknown; endDate?: unknown };
    const startDate = typeof record.startDate === 'string' ? record.startDate : null;
    const endDate = typeof record.endDate === 'string' ? record.endDate : null;
    if (startDate && endDate && endDate < startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date cannot be earlier than the start date',
      });
    }
  });
}
