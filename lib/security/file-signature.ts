export type VerifiedUpload = {
  extension: 'pdf' | 'jpg' | 'png' | 'webp' | 'tif' | 'heic' | 'avif' | 'gif' | 'bmp';
  mimeType:
    | 'application/pdf'
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/tiff'
    | 'image/heic'
    | 'image/heif'
    | 'image/avif'
    | 'image/gif'
    | 'image/bmp';
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

function hasPrefix(buffer: Buffer, prefix: Buffer): boolean {
  return buffer.length >= prefix.length && buffer.subarray(0, prefix.length).equals(prefix);
}

function mimeMatches(declaredMimeType: string, allowed: string[]): boolean {
  // Some browsers leave File.type blank for HEIC and TIFF. The verified byte
  // signature remains authoritative, while a conflicting non-empty MIME is rejected.
  return declaredMimeType === '' || allowed.includes(declaredMimeType.toLowerCase());
}

function isoBmffBrand(buffer: Buffer): 'heif' | 'avif' | null {
  if (buffer.length < 16 || buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return null;
  const declaredBoxSize = buffer.readUInt32BE(0);
  const brandListEnd = Math.min(
    buffer.length,
    declaredBoxSize >= 16 ? declaredBoxSize : 32,
    256,
  );

  for (let offset = 8; offset + 4 <= brandListEnd; offset += 4) {
    const brand = buffer.subarray(offset, offset + 4).toString('ascii').toLowerCase();
    if (HEIF_BRANDS.has(brand)) return 'heif';
    if (AVIF_BRANDS.has(brand)) return 'avif';
  }
  return null;
}

/**
 * Identifies only the formats the service accepts. Browser-supplied MIME types
 * and file extensions are metadata, not proof of a file's actual content.
 */
export function verifyUploadSignature(buffer: Buffer, declaredMimeType: string): VerifiedUpload | null {
  if (hasPrefix(buffer, Buffer.from('%PDF-'))) {
    return mimeMatches(declaredMimeType, ['application/pdf'])
      ? { mimeType: 'application/pdf', extension: 'pdf' }
      : null;
  }

  if (hasPrefix(buffer, Buffer.from([0xff, 0xd8, 0xff]))) {
    return mimeMatches(declaredMimeType, ['image/jpeg', 'image/jpg'])
      ? { mimeType: 'image/jpeg', extension: 'jpg' }
      : null;
  }

  if (hasPrefix(buffer, PNG_SIGNATURE)) {
    return mimeMatches(declaredMimeType, ['image/png'])
      ? { mimeType: 'image/png', extension: 'png' }
      : null;
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return mimeMatches(declaredMimeType, ['image/webp'])
      ? { mimeType: 'image/webp', extension: 'webp' }
      : null;
  }

  if (
    hasPrefix(buffer, Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
    hasPrefix(buffer, Buffer.from([0x4d, 0x4d, 0x00, 0x2a])) ||
    hasPrefix(buffer, Buffer.from([0x49, 0x49, 0x2b, 0x00])) ||
    hasPrefix(buffer, Buffer.from([0x4d, 0x4d, 0x00, 0x2b]))
  ) {
    return mimeMatches(declaredMimeType, ['image/tiff', 'image/tif'])
      ? { mimeType: 'image/tiff', extension: 'tif' }
      : null;
  }

  if (hasPrefix(buffer, Buffer.from('GIF87a')) || hasPrefix(buffer, Buffer.from('GIF89a'))) {
    return mimeMatches(declaredMimeType, ['image/gif'])
      ? { mimeType: 'image/gif', extension: 'gif' }
      : null;
  }

  if (hasPrefix(buffer, Buffer.from('BM'))) {
    return mimeMatches(declaredMimeType, ['image/bmp', 'image/x-ms-bmp'])
      ? { mimeType: 'image/bmp', extension: 'bmp' }
      : null;
  }

  const bmffBrand = isoBmffBrand(buffer);
  if (bmffBrand === 'heif') {
    return mimeMatches(declaredMimeType, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'])
      ? { mimeType: declaredMimeType.includes('heif') ? 'image/heif' : 'image/heic', extension: 'heic' }
      : null;
  }

  if (bmffBrand === 'avif') {
    return mimeMatches(declaredMimeType, ['image/avif'])
      ? { mimeType: 'image/avif', extension: 'avif' }
      : null;
  }

  return null;
}
