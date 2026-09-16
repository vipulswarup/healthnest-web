export function dobPasswordCandidates(value: string | Date | null | undefined): string[] {
  if (!value) return [];
  const raw = typeof value === 'string'
    ? value.slice(0, 10)
    : Number.isNaN(value.getTime())
      ? ''
      : value.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return [];
  const [, year, month, day] = match;
  const shortYear = year.slice(2);
  return [...new Set([
    `${day}${month}${year}`,
    `${day}${month}${shortYear}`,
    `${year}${month}${day}`,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${year}-${month}-${day}`,
  ])];
}
