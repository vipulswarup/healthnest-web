import { fileToJpegBytes } from '@/lib/pdf/images';
import { canvasToJpeg, getPdfPageCount, isPdfEncrypted, renderPdfPage } from '@/lib/pdf/inspect';
import {
  PdfPasswordError,
  extractPdfPages,
  imagesToPdf,
  isPdfHeader,
  loadPdf,
  mergePdfBytes,
  pdfFile,
  toPdfBytes,
  tryUnlockPdf,
  type PageRotation,
} from '@/lib/pdf/ops';

export type PreparedPage = {
  id: string;
  fileIndex: number;
  pageIndex: number;
  rotation: PageRotation;
  included: boolean;
  kind: 'pdf' | 'image';
  thumbnailUrl: string;
};

export type PreparedSource = {
  file: File;
  bytes: Uint8Array;
  kind: 'pdf' | 'image';
  encrypted: boolean;
  password?: string;
  unlockedBytes?: Uint8Array;
  pageCount: number;
};

const COMPRESS_AFTER_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export async function inspectSources(files: File[], passwords: string[]): Promise<PreparedSource[]> {
  const sources: PreparedSource[] = [];
  for (const file of files) {
    const bytes = toPdfBytes(await file.arrayBuffer());
    if (isPdfFile(file) || isPdfHeader(bytes)) {
      let encrypted = false;
      try {
        encrypted = await isPdfEncrypted(bytes);
      } catch {
        encrypted = false;
      }

      let unlockedBytes: Uint8Array | undefined;
      if (encrypted) {
        try {
          unlockedBytes = await tryUnlockPdf(bytes, passwords);
        } catch (error) {
          if (!(error instanceof PdfPasswordError)) throw error;
        }
      }

      if (encrypted && !unlockedBytes) {
        sources.push({
          file,
          bytes,
          kind: 'pdf',
          encrypted: true,
          pageCount: 0,
        });
        continue;
      }

      const working = unlockedBytes || bytes;
      let pageCount = 1;
      try {
        pageCount = await getPdfPageCount(working);
      } catch {
        const document = await loadPdf(working);
        pageCount = document.getPageCount();
      }

      sources.push({
        file,
        bytes,
        kind: 'pdf',
        encrypted: false,
        unlockedBytes,
        pageCount,
      });
    } else {
      sources.push({
        file,
        bytes,
        kind: 'image',
        encrypted: false,
        pageCount: 1,
      });
    }
  }
  return sources;
}

export async function unlockSource(source: PreparedSource, password: string): Promise<PreparedSource> {
  const unlockedBytes = await tryUnlockPdf(source.bytes, [password]);
  const pageCount = await getPdfPageCount(unlockedBytes).catch(async () => {
    const document = await loadPdf(unlockedBytes);
    return document.getPageCount();
  });
  return { ...source, encrypted: false, unlockedBytes, pageCount };
}

export async function buildPageList(sources: PreparedSource[]): Promise<PreparedPage[]> {
  const pages: PreparedPage[] = [];
  for (const [fileIndex, source] of sources.entries()) {
    const working = source.unlockedBytes || source.bytes;
    for (let pageIndex = 0; pageIndex < source.pageCount; pageIndex += 1) {
      const id = `${fileIndex}-${pageIndex}`;
      let thumbnailUrl = '';
      try {
        if (source.kind === 'image') {
          thumbnailUrl = URL.createObjectURL(source.file);
        } else {
          const canvas = await renderPdfPage(working, pageIndex + 1, {
            password: source.password,
            scale: 0.28,
          });
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.55);
        }
      } catch {
        thumbnailUrl = '';
      }
      pages.push({
        id,
        fileIndex,
        pageIndex,
        rotation: 0,
        included: true,
        kind: source.kind,
        thumbnailUrl,
      });
    }
  }
  return pages;
}

export async function buildPreparedFiles(options: {
  sources: PreparedSource[];
  pages: PreparedPage[];
  combine: boolean;
  compress: boolean;
  keepDroppedAsNext: boolean;
}): Promise<File[]> {
  const included = options.pages.filter((page) => page.included);
  if (included.length === 0) throw new Error('Select at least one page');

  if (!options.combine) {
    const files: File[] = [];
    for (const [index, source] of options.sources.entries()) {
      const sourcePages = options.pages.filter((page) => page.fileIndex === index && page.included);
      if (sourcePages.length === 0) continue;
      files.push(await buildOnePdf(source, sourcePages, options.compress, fileNameFor(source.file, index)));
    }
    return files;
  }

  const primary = await buildCombinedPdf(options.sources, included, options.compress);
  const output = [pdfFile(primary, combinedName(options.sources))];
  if (options.keepDroppedAsNext) {
    const dropped = options.pages.filter((page) => !page.included);
    if (dropped.length > 0) {
      const leftover = await buildCombinedPdf(options.sources, dropped, options.compress);
      output.push(pdfFile(leftover, 'remaining-pages.pdf'));
    }
  }
  return output;
}

async function buildOnePdf(
  source: PreparedSource,
  pages: PreparedPage[],
  compress: boolean,
  fileName: string,
): Promise<File> {
  if (source.kind === 'image') {
    const jpeg = await fileToJpegBytes(
      source.file,
      compress ? 1600 : 2000,
      compress ? 0.62 : 0.84,
      pages[0]?.rotation || 0,
    );
    const bytes = await imagesToPdf([{ bytes: jpeg, mime: 'image/jpeg' }]);
    return assertSize(pdfFile(bytes, fileName));
  }
  const working = source.unlockedBytes || source.bytes;
  const indexes = pages.map((page) => page.pageIndex);
  const rotations = pages.map((page) => page.rotation);
  let bytes = await extractPdfPages(working, indexes, rotations);
  if (compress || bytes.byteLength > COMPRESS_AFTER_BYTES) {
    bytes = await rasterizePdf(working, pages, source.password);
  }
  return assertSize(pdfFile(bytes, fileName));
}

async function buildCombinedPdf(
  sources: PreparedSource[],
  pages: PreparedPage[],
  compress: boolean,
): Promise<Uint8Array> {
  const allImages = pages.every((page) => sources[page.fileIndex]?.kind === 'image');
  const forceRaster = compress || allImages || pages.some((page) => page.rotation !== 0 && sources[page.fileIndex]?.kind === 'image');
  if (forceRaster) {
    return rasterizePages(sources, pages, compress);
  }

  const parts: Uint8Array[] = [];
  let current: { sourceIndex: number; indexes: number[]; rotations: PageRotation[] } | null = null;
  const flush = async () => {
    if (!current) return;
    const source = sources[current.sourceIndex];
    const working = source.unlockedBytes || source.bytes;
    parts.push(await extractPdfPages(working, current.indexes, current.rotations));
    current = null;
  };

  for (const page of pages) {
    const source = sources[page.fileIndex];
    if (source.kind === 'image') {
      await flush();
      const jpeg = await fileToJpegBytes(
        source.file,
        compress ? 1600 : 2000,
        compress ? 0.62 : 0.84,
        page.rotation,
      );
      parts.push(await imagesToPdf([{ bytes: jpeg, mime: 'image/jpeg' }]));
      continue;
    }
    if (!current || current.sourceIndex !== page.fileIndex) {
      await flush();
      current = { sourceIndex: page.fileIndex, indexes: [page.pageIndex], rotations: [page.rotation] };
    } else {
      current.indexes.push(page.pageIndex);
      current.rotations.push(page.rotation);
    }
  }
  await flush();

  let bytes = parts.length === 1 ? parts[0] : await mergePdfBytes(parts);
  if (compress || bytes.byteLength > COMPRESS_AFTER_BYTES) {
    bytes = await rasterizePages(sources, pages, true);
  }
  return bytes;
}

async function rasterizePages(
  sources: PreparedSource[],
  pages: PreparedPage[],
  compress: boolean,
): Promise<Uint8Array> {
  const images: Array<{ bytes: Uint8Array; mime: 'image/jpeg' }> = [];
  const quality = compress ? 0.62 : 0.8;
  const scale = compress ? 1.15 : 1.6;
  for (const page of pages) {
    const source = sources[page.fileIndex];
    const working = source.unlockedBytes || source.bytes;
    if (source.kind === 'image') {
      const jpeg = await fileToJpegBytes(source.file, compress ? 1600 : 2000, quality, page.rotation);
      images.push({ bytes: jpeg, mime: 'image/jpeg' });
      continue;
    }
    const canvas = await renderPdfPage(working, page.pageIndex + 1, {
      password: source.password,
      scale,
      rotation: page.rotation,
    });
    images.push({ bytes: await canvasToJpeg(canvas, quality), mime: 'image/jpeg' });
  }
  return imagesToPdf(images);
}

async function rasterizePdf(
  bytes: Uint8Array,
  pages: PreparedPage[],
  password?: string,
): Promise<Uint8Array> {
  const images: Array<{ bytes: Uint8Array; mime: 'image/jpeg' }> = [];
  for (const page of pages) {
    const canvas = await renderPdfPage(bytes, page.pageIndex + 1, {
      password,
      scale: 1.15,
      rotation: page.rotation,
    });
    images.push({ bytes: await canvasToJpeg(canvas, 0.62), mime: 'image/jpeg' });
  }
  return imagesToPdf(images);
}

function fileNameFor(file: File, index: number): string {
  const base = file.name.replace(/\.[^.]+$/, '') || `document-${index + 1}`;
  return `${base}.pdf`;
}

function combinedName(sources: PreparedSource[]): string {
  if (sources.length === 1) return fileNameFor(sources[0].file, 0);
  if (sources.every((source) => source.kind === 'image')) return `scan-${new Date().toISOString().slice(0, 10)}.pdf`;
  return 'merged-reports.pdf';
}

function assertSize(file: File): File {
  if (file.size > MAX_OUTPUT_BYTES) {
    throw new Error('The prepared file is still over 50MB. Remove pages or turn on compress.');
  }
  return file;
}

export { PdfPasswordError };
