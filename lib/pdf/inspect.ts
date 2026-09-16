import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

let workerReady = false;

export function ensurePdfjsWorker() {
  if (workerReady || typeof window === 'undefined') return;
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  workerReady = true;
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return bytes.slice();
}

async function openPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  ensurePdfjsWorker();
  return getDocument({
    data: copyBytes(bytes),
    password: password || '',
    disableAutoFetch: true,
    disableStream: true,
    isEvalSupported: false,
  }).promise;
}

export async function isPdfEncrypted(bytes: Uint8Array): Promise<boolean> {
  try {
    const pdf = await openPdf(bytes);
    await pdf.destroy();
    return false;
  } catch (error) {
    if ((error as { name?: string })?.name === 'PasswordException') {
      return true;
    }
    throw error;
  }
}

export async function getPdfPageCount(bytes: Uint8Array, password?: string): Promise<number> {
  const pdf = await openPdf(bytes, password);
  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}

export async function renderPdfPage(
  bytes: Uint8Array,
  pageNumber: number,
  options: {
    password?: string;
    scale?: number;
    rotation?: number;
  } = {},
): Promise<HTMLCanvasElement> {
  const pdf = await openPdf(bytes, options.password);
  try {
    const page = await pdf.getPage(pageNumber);
    const rotation = (((page.rotate || 0) + (options.rotation || 0)) % 360 + 360) % 360;
    const viewport = page.getViewport({
      scale: options.scale ?? 1.2,
      rotation,
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a canvas for this PDF page');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas;
  } finally {
    await pdf.destroy();
  }
}

export async function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.72): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not compress this page'))),
      'image/jpeg',
      quality,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}
