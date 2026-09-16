import { detectDocumentQuad } from '@/lib/scan/detect';
import { applyScanFilter, type ScanFilter } from '@/lib/scan/enhance';
import { defaultPageQuad, scaleQuad, type Quad } from '@/lib/scan/geometry';
import { outputSizeForQuad, warpQuad } from '@/lib/scan/warp';

export type { ScanFilter };

export type ScanResult = {
  file: File;
  warpedBlob: Blob;
  previewUrl: string;
  detected: boolean;
};

export type CropDraft = {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  quad: Quad;
  detected: boolean;
  fileName: string;
};

const DETECT_MAX_EDGE = 720;
const OUTPUT_MAX_EDGE = 2000;

async function decodeToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(blob);
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not read this photo');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

function canvasImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read this photo');
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function putImage(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not write this scan');
  context.putImageData(image, 0, 0);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not save this scan'))),
      'image/jpeg',
      quality,
    );
  });
}

async function fileFromCanvas(canvas: HTMLCanvasElement, quality: number, name: string): Promise<File> {
  const blob = await canvasToBlob(canvas, quality);
  return new File([blob], name, { type: 'image/jpeg' });
}

export function detectOn(image: ImageData): Quad | null {
  const edge = Math.max(image.width, image.height);
  const scale = edge > DETECT_MAX_EDGE ? DETECT_MAX_EDGE / edge : 1;
  if (scale === 1) return detectDocumentQuad(image);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return detectDocumentQuad(image);
  context.drawImage(putImage(image), 0, 0, width, height);
  const quad = detectDocumentQuad(context.getImageData(0, 0, width, height));
  if (!quad) return null;
  return scaleQuad(quad, image.width / width, image.height / height);
}

function clampQuad(quad: Quad, width: number, height: number): Quad {
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
  return {
    tl: { x: clamp(quad.tl.x, width - 1), y: clamp(quad.tl.y, height - 1) },
    tr: { x: clamp(quad.tr.x, width - 1), y: clamp(quad.tr.y, height - 1) },
    br: { x: clamp(quad.br.x, width - 1), y: clamp(quad.br.y, height - 1) },
    bl: { x: clamp(quad.bl.x, width - 1), y: clamp(quad.bl.y, height - 1) },
  };
}

async function scanSource(source: ImageData, filter: ScanFilter, fileName: string, quad: Quad | null): Promise<ScanResult> {
  let warped = source;
  if (quad) {
    const size = outputSizeForQuad(quad, OUTPUT_MAX_EDGE);
    warped = warpQuad(source, clampQuad(quad, source.width, source.height), size.width, size.height);
  } else {
    const edge = Math.max(source.width, source.height);
    if (edge > OUTPUT_MAX_EDGE) {
      const scale = OUTPUT_MAX_EDGE / edge;
      const canvas = putImage(source);
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.round(source.width * scale));
      resized.height = Math.max(1, Math.round(source.height * scale));
      const context = resized.getContext('2d');
      if (context) {
        context.drawImage(canvas, 0, 0, resized.width, resized.height);
        warped = context.getImageData(0, 0, resized.width, resized.height);
      }
    }
  }

  const warpedCanvas = putImage(warped);
  const warpedBlob = await canvasToBlob(warpedCanvas, 0.92);
  const filtered = applyScanFilter(warped, filter);
  const file = await fileFromCanvas(putImage(filtered), filter === 'photo' ? 0.84 : 0.88, fileName);
  return {
    file,
    warpedBlob,
    previewUrl: URL.createObjectURL(file),
    detected: Boolean(quad),
  };
}

export async function prepareCrop(blob: Blob, fileName = 'scan.jpg'): Promise<CropDraft> {
  const canvas = await decodeToCanvas(blob);
  const source = canvasImageData(canvas);
  const detected = detectOn(source);
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width: source.width,
    height: source.height,
    quad: detected || defaultPageQuad(source.width, source.height),
    detected: Boolean(detected),
    fileName,
  };
}

export async function scanPhoto(
  blob: Blob,
  filter: ScanFilter,
  fileName = 'scan.jpg',
  options: { crop?: boolean; quad?: Quad } = {},
): Promise<ScanResult> {
  const sourceCanvas = await decodeToCanvas(blob);
  const source = canvasImageData(sourceCanvas);
  const quad = options.quad || (options.crop === false ? null : detectOn(source));
  return scanSource(source, filter, fileName, quad);
}

export async function rescanWithFilter(warpedBlob: Blob, filter: ScanFilter, fileName = 'scan.jpg'): Promise<File> {
  const canvas = await decodeToCanvas(warpedBlob);
  const filtered = applyScanFilter(canvasImageData(canvas), filter);
  return fileFromCanvas(putImage(filtered), filter === 'photo' ? 0.84 : 0.88, fileName);
}
