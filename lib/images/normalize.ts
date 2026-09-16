import sharp from 'sharp';

const DEFAULT_MAX_EDGE = 2000;
const MAX_INPUT_PIXELS = 100_000_000;

export function isHeicMime(mimeType: string): boolean {
  return /image\/hei[cf](?:-sequence)?/i.test(mimeType);
}

export function needsBrowserPreviewConversion(mimeType: string): boolean {
  return isHeicMime(mimeType) || mimeType === 'image/tiff' || mimeType === 'image/tif';
}

/**
 * Produces a browser- and vision-model-safe, correctly oriented first-page JPEG.
 * The original upload remains untouched in object storage.
 */
export async function normalizeImageToJpeg(
  input: Buffer,
  mimeType: string,
  maxEdge: number = DEFAULT_MAX_EDGE,
): Promise<Buffer> {
  let decodableInput = input;

  // The standard sharp/libvips serverless build decodes AVIF but commonly omits
  // patented HEIC decoding. libheif-js provides that portable decode step.
  if (isHeicMime(mimeType)) {
    const { default: heicConvert } = await import('heic-convert');
    decodableInput = Buffer.from(await heicConvert({
      buffer: input,
      format: 'JPEG',
      quality: 1,
    }));
  }

  return sharp(decodableInput, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
    pages: 1,
  })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}
