import { AppError } from '@/lib/middleware/error-handler';
import { normalizeImageToJpeg } from '@/lib/images/normalize';
import { medicationCountrySchema } from '@/lib/medications/schemas';
import { medicationLabelPrompt } from '@/lib/services/prompts/medication-label.prompt';
import { searchVerifiedCatalogueProducts } from '@/lib/services/medication-catalog-search.service';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
const MAX_VISION_IMAGE_EDGE = 1600;

export type MedicationLabelExtraction = {
  brandName: string | null;
  purchaseCountry: 'IN' | 'US' | 'GB' | null;
  formulation: string | null;
  ingredients: Array<{
    canonicalInn: string;
    localAlias?: string | null;
    strength: string;
    strengthUnit: string;
  }>;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  confidence: number;
  catalogueMatches: Awaited<ReturnType<typeof searchVerifiedCatalogueProducts>>;
};

function stripModelThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*thinking[\s\S]*?(?=\n[A-Z0-9{[])/i, '')
    .trim();
}

function parseJsonPayload(text: string): Record<string, unknown> {
  const cleaned = stripModelThinking(text);
  const direct = cleaned.match(/\{[\s\S]*\}/);
  if (!direct) throw new Error('No JSON object in vision response');
  return JSON.parse(direct[0]) as Record<string, unknown>;
}

function normalizeIngredients(raw: unknown): MedicationLabelExtraction['ingredients'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const canonicalInn = String(record.canonicalInn || record.inn || record.salt || '').trim();
      const strength = String(record.strength || '').trim();
      const strengthUnit = String(record.strengthUnit || record.unit || 'mg').trim();
      if (!canonicalInn || !strength || !strengthUnit) return null;
      return {
        canonicalInn,
        localAlias: record.localAlias ? String(record.localAlias).trim() : null,
        strength,
        strengthUnit,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function extractViaGroqVision(imageBuffer: Buffer, mime: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AppError('Medicine photo recognition is unavailable right now', 503);
  }

  const dataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: medicationLabelPrompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      temperature: 0.1,
      max_completion_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new AppError('Could not read the medicine photo', 502);
  }

  const data = await response.json();
  const content = String(data.choices?.[0]?.message?.content || '');
  if (!content) throw new AppError('Could not read the medicine photo', 502);
  return parseJsonPayload(content);
}

export async function extractMedicationFromPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  defaultCountry: 'IN' | 'US' | 'GB' = 'IN',
): Promise<MedicationLabelExtraction> {
  const normalizedMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const jpegBuffer = normalizedMime.startsWith('image/')
    ? await normalizeImageToJpeg(fileBuffer, normalizedMime, MAX_VISION_IMAGE_EDGE)
    : fileBuffer;

  const parsed = await extractViaGroqVision(jpegBuffer, 'image/jpeg');
  const countryParsed = medicationCountrySchema.safeParse(parsed.purchaseCountry);
  const purchaseCountry = countryParsed.success ? countryParsed.data : defaultCountry;
  const brandName = parsed.brandName ? String(parsed.brandName).trim() : null;
  const ingredients = normalizeIngredients(parsed.ingredients);

  const catalogueMatches = brandName
    ? await searchVerifiedCatalogueProducts(purchaseCountry, brandName, 8)
    : [];

  return {
    brandName,
    purchaseCountry,
    formulation: parsed.formulation ? String(parsed.formulation).trim() : null,
    ingredients,
    dosage: parsed.dosage ? String(parsed.dosage).trim() : null,
    frequency: parsed.frequency ? String(parsed.frequency).trim() : null,
    route: parsed.route ? String(parsed.route).trim() : null,
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    catalogueMatches,
  };
}
