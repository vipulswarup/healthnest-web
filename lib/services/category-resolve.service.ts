import { sql } from '@/lib/db/neon';
import {
  getAllCategories,
  getValidCategoryDisplayNames,
  invalidateCategoriesCache,
  resolveClassification,
} from '@/lib/services/category.service';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';

export type CategoryResolveResult =
  | { action: 'use_existing'; code: string; displayName: string }
  | { action: 'created'; code: string; displayName: string }
  | { action: 'suggest'; suggestion: { code: string; displayName: string }; customLabel: string };

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';

function codeFromDisplayName(displayName: string): string {
  const base = displayName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return base || 'OTHER';
}

function normalizeDisplayName(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function askAi(label: string, existingNames: string[]): Promise<{
  legitimate: boolean;
  normalizedName: string | null;
  closestExisting: string | null;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { legitimate: false, normalizedName: null, closestExisting: resolveClassification(label, existingNames) };
  }

  const system = `You decide whether a user-entered health document type is a legitimate clinical document category.
Return JSON only:
{"legitimate": boolean, "normalizedName": string|null, "closestExisting": string|null}
Rules:
- legitimate=true only for real clinical/admin health document kinds (e.g. Holter Report, Dental Note).
- If legitimate, normalizedName is a short Title Case name (2-4 words), not a patient/doctor/date.
- closestExisting MUST be exactly one of the provided existing category names when legitimate is false, or when the label is clearly the same as an existing one.
- Reject nonsense, filenames, dosages, person names, and one-off free text.`;

  const user = `Existing categories:\n${existingNames.map((n) => `- ${n}`).join('\n')}\n\nUser label: ${JSON.stringify(label)}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      return { legitimate: false, normalizedName: null, closestExisting: resolveClassification(label, existingNames) };
    }
    const data = await response.json();
    const parsed = JSON.parse(String(data.choices?.[0]?.message?.content || '{}'));
    return {
      legitimate: Boolean(parsed.legitimate),
      normalizedName: typeof parsed.normalizedName === 'string' ? parsed.normalizedName.trim() : null,
      closestExisting: typeof parsed.closestExisting === 'string' ? parsed.closestExisting.trim() : null,
    };
  } catch {
    return { legitimate: false, normalizedName: null, closestExisting: resolveClassification(label, existingNames) };
  }
}

async function insertCategory(code: string, displayName: string): Promise<HealthRecordCategory> {
  const [row] = await sql`
    INSERT INTO health_record_categories (code, display_name, description, is_active)
    VALUES (${code}, ${displayName}, ${`User-added: ${displayName}`}, TRUE)
    ON CONFLICT (code) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING id, code, display_name AS "displayName", is_active AS "isActive"
  `;
  invalidateCategoriesCache();
  return {
    id: String(row.id),
    code: String(row.code),
    displayName: String(row.displayName),
    standardSystem: null,
    standardCode: null,
    isActive: Boolean(row.isActive),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function findByName(categories: HealthRecordCategory[], name: string | null | undefined) {
  if (!name?.trim()) return undefined;
  const needle = name.trim().toLowerCase();
  return categories.find((cat) => cat.displayName.toLowerCase() === needle || cat.code.toLowerCase() === needle);
}

export async function resolveCustomRecordType(rawLabel: string): Promise<CategoryResolveResult> {
  const customLabel = rawLabel.trim();
  if (!customLabel) {
    return { action: 'use_existing', code: 'OTHER', displayName: 'Other' };
  }

  const categories = await getAllCategories();
  const names = getValidCategoryDisplayNames(categories);

  const exact = findByName(categories, customLabel) || findByName(categories, normalizeDisplayName(customLabel));
  if (exact && exact.code !== 'OTHER') {
    return { action: 'use_existing', code: exact.code, displayName: exact.displayName };
  }

  const ai = await askAi(customLabel, names);
  if (ai.legitimate) {
    const displayName = normalizeDisplayName(ai.normalizedName || customLabel);
    const existing = findByName(categories, displayName);
    if (existing && existing.code !== 'OTHER') {
      return { action: 'use_existing', code: existing.code, displayName: existing.displayName };
    }
    let code = codeFromDisplayName(displayName);
    if (code === 'OTHER' || categories.some((cat) => cat.code === code)) {
      code = `${code}_${Date.now().toString(36).toUpperCase()}`.slice(0, 48);
    }
    const created = await insertCategory(code, displayName);
    return { action: 'created', code: created.code, displayName: created.displayName };
  }

  const suggestedName = ai.closestExisting || resolveClassification(customLabel, names);
  const suggestion = findByName(categories, suggestedName) || categories.find((cat) => cat.code === 'OTHER') || categories[0];
  return {
    action: 'suggest',
    suggestion: { code: suggestion.code, displayName: suggestion.displayName },
    customLabel,
  };
}
