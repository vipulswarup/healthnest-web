import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
} from '@cantoo/pdf-lib';

export class PdfPasswordError extends Error {
  constructor(message = 'This PDF is password protected') {
    super(message);
    this.name = 'PdfPasswordError';
  }
}

export type PageRotation = 0 | 90 | 180 | 270;

const WIN_ANSI = /[^\t\n\r\x20-\x7e]/g;

export function toPdfBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export function isPdfHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
}

export function sanitizePdfText(text: string): string {
  return text.replace(WIN_ANSI, ' ').replace(/[ \t]+\n/g, '\n').trim();
}

function isPasswordFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /password|encrypt/i.test(message);
}

export async function loadPdf(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, password ? { password } : undefined);
  } catch (error) {
    if (isPasswordFailure(error)) throw new PdfPasswordError();
    throw error;
  }
}

export async function unlockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const document = await loadPdf(bytes, password);
  return document.save();
}

export async function tryUnlockPdf(bytes: Uint8Array, passwords: string[]): Promise<Uint8Array> {
  try {
    const document = await loadPdf(bytes);
    return document.save();
  } catch (error) {
    if (!(error instanceof PdfPasswordError)) throw error;
  }
  for (const password of passwords) {
    if (!password) continue;
    try {
      return await unlockPdf(bytes, password);
    } catch (error) {
      if (!(error instanceof PdfPasswordError)) throw error;
    }
  }
  throw new PdfPasswordError();
}

export async function mergePdfBytes(sources: Uint8Array[]): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  for (const source of sources) {
    const document = await loadPdf(source);
    const pages = await output.copyPages(document, document.getPageIndices());
    for (const page of pages) output.addPage(page);
  }
  return output.save();
}

export async function extractPdfPages(
  bytes: Uint8Array,
  pageIndexes: number[],
  rotations: PageRotation[] = [],
): Promise<Uint8Array> {
  const source = await loadPdf(bytes);
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pageIndexes);
  copied.forEach((page, index) => {
    applyRotation(page, rotations[index] || 0);
    output.addPage(page);
  });
  return output.save();
}

function applyRotation(page: PDFPage, extra: PageRotation) {
  if (!extra) return;
  const current = page.getRotation().angle || 0;
  page.setRotation(degrees((((current + extra) % 360) + 360) % 360));
}

export async function imagesToPdf(
  images: Array<{ bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' }>,
): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const [pageWidth, pageHeight] = PageSizes.A4;
  const margin = 18;

  for (const image of images) {
    const embedded = image.mime === 'image/png'
      ? await output.embedPng(image.bytes)
      : await output.embedJpg(image.bytes);
    const page = output.addPage([pageWidth, pageHeight]);
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    page.drawImage(embedded, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }

  return output.save();
}

export async function stampInvisibleText(bytes: Uint8Array, text: string): Promise<Uint8Array> {
  const cleaned = sanitizePdfText(text);
  if (!cleaned) return bytes;

  const document = await loadPdf(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  if (pages.length === 0) return bytes;

  const chunkSize = Math.max(1, Math.ceil(cleaned.length / pages.length));
  pages.forEach((page, index) => {
    const slice = cleaned.slice(index * chunkSize, (index + 1) * chunkSize);
    if (!slice) return;
    const { width, height } = page.getSize();
    page.drawText(slice, {
      x: 8,
      y: Math.max(12, height - 14),
      size: 4,
      font,
      color: rgb(1, 1, 1),
      opacity: 0.01,
      maxWidth: Math.max(40, width - 16),
      lineHeight: 5,
    });
  });

  return document.save();
}

export async function addWatermark(bytes: Uint8Array, text: string): Promise<Uint8Array> {
  const label = sanitizePdfText(text).slice(0, 80);
  if (!label) return bytes;
  const document = await loadPdf(bytes);
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(label, {
      x: 36,
      y: height / 2,
      size: Math.min(28, Math.max(14, width / 18)),
      font,
      rotate: degrees(-32),
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.22,
    });
  }
  return document.save();
}

export async function encryptPdf(bytes: Uint8Array, userPassword: string): Promise<Uint8Array> {
  const password = userPassword.trim();
  if (!password) return bytes;
  const document = await loadPdf(bytes);
  document.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: { printing: 'highResolution', copying: false, modifying: false },
  });
  return document.save();
}

export async function createCoverPdf(
  title: string,
  identityLine: string,
  sections: Array<{ heading: string; lines: string[] }>,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage(PageSizes.A4);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  let y = height - 56;

  page.drawText(sanitizePdfText(title).slice(0, 60) || 'For the Doctor', {
    x: 48,
    y,
    size: 22,
    font: bold,
    color: rgb(0.05, 0.05, 0.08),
  });
  y -= 28;
  if (identityLine) {
    page.drawText(sanitizePdfText(identityLine).slice(0, 90), {
      x: 48,
      y,
      size: 12,
      font,
      color: rgb(0.25, 0.25, 0.28),
    });
    y -= 28;
  }

  for (const section of sections) {
    if (y < 80) break;
    page.drawText(sanitizePdfText(section.heading).slice(0, 40), {
      x: 48,
      y,
      size: 13,
      font: bold,
      color: rgb(0.05, 0.05, 0.08),
    });
    y -= 18;
    const lines = section.lines.length > 0 ? section.lines : ['None recorded'];
    for (const line of lines.slice(0, 12)) {
      if (y < 64) break;
      page.drawText(`- ${sanitizePdfText(line).slice(0, 100)}`, {
        x: 56,
        y,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.18),
        maxWidth: width - 110,
      });
      y -= 14;
    }
    y -= 10;
  }

  return document.save();
}

export function pdfFile(bytes: Uint8Array, fileName: string): File {
  return new File([bytes as BlobPart], fileName, { type: 'application/pdf' });
}
