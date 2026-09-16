const TITLE_PREFIX = /^\s*(dr\.?|doctor|prof\.?|professor)\s+/i;

export function stripDoctorTitle(raw: string): string {
  return String(raw || '').replace(TITLE_PREFIX, '').replace(/\s+/g, ' ').trim();
}

export function normalizeDoctorKey(raw: string): string {
  return stripDoctorTitle(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDoctorDisplay(raw: string): string {
  const core = stripDoctorTitle(raw);
  if (!core) return '';
  const titled = core
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return `Dr. ${titled}`;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = new Array<number>(rows * cols);
  for (let i = 0; i < rows; i += 1) grid[i * cols] = i;
  for (let j = 0; j < cols; j += 1) grid[j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i * cols + j] = Math.min(
        grid[(i - 1) * cols + j] + 1,
        grid[i * cols + j - 1] + 1,
        grid[(i - 1) * cols + j - 1] + cost,
      );
    }
  }
  return grid[a.length * cols + b.length];
}

function nameTokens(raw: string): string[] {
  return normalizeDoctorKey(raw).split(' ').filter((token) => token.length > 1);
}

export function namesLikelySame(left: string, right: string): boolean {
  const a = normalizeDoctorKey(left);
  const b = normalizeDoctorKey(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aTokens = nameTokens(left);
  const bTokens = nameTokens(right);
  if (aTokens.length < 2 || bTokens.length < 2) {
    return Math.min(a.length, b.length) >= 8 && levenshtein(a, b) <= 2;
  }

  const firstOk = levenshtein(aTokens[0], bTokens[0]) <= 1;
  const lastOk = levenshtein(aTokens[aTokens.length - 1], bTokens[bTokens.length - 1]) <= 2;
  return firstOk && lastOk;
}

function displayScore(name: string): number {
  let score = 0;
  if (/^Dr\.\s/.test(name.trim())) score += 2;
  if (name !== name.toUpperCase()) score += 2;
  if (/[a-z]/.test(name) && /[A-Z]/.test(name)) score += 1;
  return score;
}

export function pickCanonicalDoctorName(variants: string[]): string {
  const cleaned = variants.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  const preferred = [...cleaned].sort((a, b) => displayScore(b) - displayScore(a) || b.length - a.length)[0];
  return formatDoctorDisplay(preferred);
}

export function clusterDoctorNames(names: string[]): string[] {
  const clusters: string[][] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const existing = clusters.find((cluster) => namesLikelySame(cluster[0], trimmed));
    if (existing) existing.push(trimmed);
    else clusters.push([trimmed]);
  }
  return clusters.map(pickCanonicalDoctorName).filter(Boolean);
}

export function matchDoctorName(
  input: string,
  catalog: Array<{ preferredName: string; aliases?: string[] | null }>,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const row of catalog) {
    const aliases = row.aliases || [];
    if (namesLikelySame(trimmed, row.preferredName) || aliases.some((alias) => namesLikelySame(trimmed, alias))) {
      return formatDoctorDisplay(row.preferredName);
    }
  }
  return null;
}
