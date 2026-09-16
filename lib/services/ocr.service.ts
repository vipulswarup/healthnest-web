import { AppError } from '@/lib/middleware/error-handler';
import path from 'path';
import { PNG } from 'pngjs';
import { extractImages, extractText, getDocumentProxy } from 'unpdf';
import { normalizeImageToJpeg } from '../images/normalize';
import { getR2Object } from '../r2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Llama 4 Scout was shut down 2026-07-17; qwen3.6 still accepts image inputs on Groq. */
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
const MIN_USEFUL_TEXT_CHARS = 80;
/** qwen/qwen3.6-27b rejects more than 3 images per request. */
const MAX_VISION_IMAGES_PER_REQUEST = 3;
const MAX_VISION_IMAGE_EDGE = 1600;
const MIN_USEFUL_IMAGE_PIXELS = 80_000;
/** Soft cap for full-document scanned OCR jobs. */
const MAX_FULL_OCR_PAGES = 40;

export type OcrMode = 'intake' | 'full';

export interface OcrOptions {
  /**
   * intake: first-page metadata for upload/categorization (default).
   * full: whole document text for later lab-value extraction.
   */
  mode?: OcrMode;
}

type ImagePayload = { mime: string; dataUrl: string };
type RawPdfImage = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: 1 | 3 | 4;
  page: number;
  pixels: number;
};

function mimeFromExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.webp':
      return 'image/webp';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.avif':
      return 'image/avif';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

async function readInputBuffer(input: string, isR2Key: boolean): Promise<Buffer> {
  if (isR2Key) {
    const body = await getR2Object(input);
    if (!body) throw new Error('Empty body from R2');
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const localPath = input.startsWith('file://') ? input.replace(/^file:\/\//, '') : input;
  if (localPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(localPath)) {
    const fs = await import('node:fs/promises');
    return Buffer.from(await fs.readFile(localPath));
  }

  const response = await fetch(input);
  if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

function toRgba(
  image: { data: Uint8ClampedArray; width: number; height: number; channels: 1 | 3 | 4 },
): { data: Buffer; width: number; height: number } {
  const { width, height, channels, data: src } = image;
  const rgba = Buffer.alloc(width * height * 4);
  if (channels === 4) {
    rgba.set(src);
  } else if (channels === 3) {
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      rgba[j] = src[i];
      rgba[j + 1] = src[i + 1];
      rgba[j + 2] = src[i + 2];
      rgba[j + 3] = 255;
    }
  } else {
    for (let i = 0, j = 0; i < src.length; i += 1, j += 4) {
      rgba[j] = src[i];
      rgba[j + 1] = src[i];
      rgba[j + 2] = src[i];
      rgba[j + 3] = 255;
    }
  }
  return { data: rgba, width, height };
}

function downscaleRgba(
  rgba: Buffer,
  width: number,
  height: number,
  maxEdge: number,
): { data: Buffer; width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { data: rgba, width, height };

  const scale = maxEdge / edge;
  const nextWidth = Math.max(2, Math.round(width * scale));
  const nextHeight = Math.max(2, Math.round(height * scale));
  const next = Buffer.alloc(nextWidth * nextHeight * 4);

  for (let y = 0; y < nextHeight; y += 1) {
    const srcY = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < nextWidth; x += 1) {
      const srcX = Math.min(width - 1, Math.floor(x / scale));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * nextWidth + x) * 4;
      next[dstIdx] = rgba[srcIdx];
      next[dstIdx + 1] = rgba[srcIdx + 1];
      next[dstIdx + 2] = rgba[srcIdx + 2];
      next[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }

  return { data: next, width: nextWidth, height: nextHeight };
}

function encodeRawImageToPngDataUrl(image: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: 1 | 3 | 4;
}): string {
  const rgba = toRgba(image);
  const scaled = downscaleRgba(rgba.data, rgba.width, rgba.height, MAX_VISION_IMAGE_EDGE);
  const png = new PNG({ width: scaled.width, height: scaled.height });
  png.data = Buffer.from(scaled.data);
  const encoded = PNG.sync.write(png);
  return `data:image/png;base64,${encoded.toString('base64')}`;
}

function stripModelThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*thinking[\s\S]*?(?=\n[A-Z0-9])/i, '')
    .trim();
}

async function extractPdfText(buffer: Buffer, options?: { firstPageOnly?: boolean }): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  if (options?.firstPageOnly) {
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [String(text ?? '')];
    return String(pages[0] ?? '').trim();
  }
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text ?? '').trim();
}

async function collectPdfImages(
  buffer: Buffer,
  options: { maxPages: number; pageStart?: number },
): Promise<RawPdfImage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const start = options.pageStart ?? 1;
  const end = Math.min(pdf.numPages || 1, start + options.maxPages - 1);
  const all: RawPdfImage[] = [];

  for (let page = start; page <= end; page += 1) {
    for (const image of await extractImages(pdf, page)) {
      all.push({
        ...image,
        page,
        pixels: image.width * image.height,
      });
    }
  }

  return all;
}

function pickLargestImages(images: RawPdfImage[], limit: number): RawPdfImage[] {
  const largeEnough = images.filter((item) => item.pixels >= MIN_USEFUL_IMAGE_PIXELS);
  const pool = largeEnough.length > 0 ? largeEnough : images;
  return [...pool].sort((a, b) => b.pixels - a.pixels).slice(0, limit);
}

function toVisionPayloads(images: RawPdfImage[]): ImagePayload[] {
  return images.map((image) => ({
    mime: 'image/png',
    dataUrl: encodeRawImageToPngDataUrl(image),
  }));
}

async function extractViaExternalService(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string | null> {
  const base = process.env.OCR_SERVICE_URL?.replace(/\/$/, '');
  if (!base) return null;
  if (/localhost|127\.0\.0\.1/.test(base)) {
    return null;
  }

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: contentType }), fileName);

  const endpoints = [`${base}/ocr`, base];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body: form });
      if (!response.ok) continue;
      const data = await response.json().catch(() => ({}));
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (text) return text;
    } catch {
      // Try the next configured endpoint without logging document or provider details.
    }
  }

  return null;
}

async function extractViaGroqVision(images: ImagePayload[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required for vision OCR on serverless');
  }
  if (images.length === 0) {
    throw new Error('No images available for vision OCR');
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text:
        'Extract all readable text from these medical document page images. ' +
        'Preserve labels, values, dates, doctor names, facility/hospital names, and table structure. ' +
        'Return plain text only, with line breaks.',
    },
    ...images.slice(0, MAX_VISION_IMAGES_PER_REQUEST).map((image) => ({
      type: 'image_url',
      image_url: { url: image.dataUrl },
    })),
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_completion_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq vision OCR failed: ${response.status}`);
  }

  const data = await response.json();
  const text = stripModelThinking(String(data.choices?.[0]?.message?.content || ''));
  if (!text) throw new Error('Groq vision OCR returned empty text');
  return text;
}

async function extractFromImageBuffer(buffer: Buffer, mime: string): Promise<string> {
  return extractViaGroqVision([
    { mime, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` },
  ]);
}

/** Intake: one largest image from page 1 (metadata lives in the header). */
async function extractIntakeVisionText(buffer: Buffer): Promise<string> {
  const pageOneImages = await collectPdfImages(buffer, { maxPages: 1, pageStart: 1 });
  const selected = pickLargestImages(pageOneImages, 1);
  if (selected.length === 0) {
    throw new Error('No embedded images found on the first PDF page for vision OCR');
  }
  return extractViaGroqVision(toVisionPayloads(selected));
}

/**
 * Full document: OCR page images in batches of 3 for later lab-value extraction.
 * Prefer calling this from a dedicated job; intake should use mode "intake".
 */
async function extractFullVisionText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const totalPages = Math.min(pdf.numPages || 1, MAX_FULL_OCR_PAGES);
  const pageImages: RawPdfImage[] = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const images = await collectPdfImages(buffer, { maxPages: 1, pageStart: page });
    const best = pickLargestImages(images, 1)[0];
    if (best) pageImages.push(best);
  }

  if (pageImages.length === 0) {
    throw new Error('No embedded images found for full-document vision OCR');
  }

  const chunks: string[] = [];
  for (let i = 0; i < pageImages.length; i += MAX_VISION_IMAGES_PER_REQUEST) {
    const batch = pageImages.slice(i, i + MAX_VISION_IMAGES_PER_REQUEST);
    const pageLabel = batch.map((img) => img.page).join('-');
    const batchText = await extractViaGroqVision(toVisionPayloads(batch));
    chunks.push(`--- Pages ${pageLabel} ---\n${batchText}`);
  }

  return chunks.join('\n\n');
}

export async function extractTextFromImage(
  input: string,
  isR2Key: boolean = false,
  options: OcrOptions = {},
): Promise<string> {
  const mode: OcrMode = options.mode || 'intake';
  const extension = path.extname(input) || '.jpg';
  const mime = mimeFromExtension(extension);
  const fileName = path.basename(input) || `document${extension}`;

  try {
    const originalBuffer = await readInputBuffer(input, isR2Key);
    const isImage = mime.startsWith('image/');
    const buffer = isImage
      ? await normalizeImageToJpeg(originalBuffer, mime, MAX_VISION_IMAGE_EDGE)
      : originalBuffer;
    const processingMime = isImage ? 'image/jpeg' : mime;
    const processingFileName = isImage ? `${path.parse(fileName).name}.jpg` : fileName;

    const externalText = await extractViaExternalService(buffer, processingFileName, processingMime);
    if (mode !== 'full' && externalText && externalText.length >= MIN_USEFUL_TEXT_CHARS) {
      return externalText;
    }

    if (mime === 'application/pdf' || extension.toLowerCase() === '.pdf') {
      const pdfText = await extractPdfText(buffer, {
        firstPageOnly: false,
      });
      if (mode === 'full') {
        const visionText = await extractFullVisionText(buffer);
        const candidates = [externalText || '', pdfText, visionText].sort((a, b) => b.length - a.length);
        return candidates[0] || pdfText || visionText;
      }
      if (pdfText.length >= MIN_USEFUL_TEXT_CHARS) {
        return pdfText;
      }

      const visionText = await extractIntakeVisionText(buffer);
      return visionText;
    }

    const imageText = await extractFromImageBuffer(buffer, processingMime);
    return imageText;
  } catch {
    throw new AppError('Failed to process document with OCR', 502);
  }
}

export async function pdfLacksTextLayer(buffer: Buffer): Promise<boolean> {
  try {
    const text = await extractPdfText(buffer);
    return text.length < MIN_USEFUL_TEXT_CHARS;
  } catch {
    return true;
  }
}
