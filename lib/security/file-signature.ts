export type VerifiedUpload = {
  extension:
    | 'pdf'
    | 'jpg'
    | 'png'
    | 'webp'
    | 'tif'
    | 'heic'
    | 'avif'
    | 'gif'
    | 'bmp'
    | 'docx'
    | 'xlsx'
    | 'pptx'
    | 'doc'
    | 'xls'
    | 'ppt';
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
    | 'image/bmp'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    | 'application/msword'
    | 'application/vnd.ms-excel'
    | 'application/vnd.ms-powerpoint';
};

const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const OFFICE_XML = {
  docx: {
    extension: 'docx' as const,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const,
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
  },
  xlsx: {
    extension: 'xlsx' as const,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const,
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  },
  pptx: {
    extension: 'pptx' as const,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' as const,
    mimes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
  },
};
const OFFICE_OLE = {
  doc: {
    extension: 'doc' as const,
    mimeType: 'application/msword' as const,
    mimes: ['application/msword'],
  },
  xls: {
    extension: 'xls' as const,
    mimeType: 'application/vnd.ms-excel' as const,
    mimes: ['application/vnd.ms-excel', 'application/msexcel'],
  },
  ppt: {
    extension: 'ppt' as const,
    mimeType: 'application/vnd.ms-powerpoint' as const,
    mimes: ['application/vnd.ms-powerpoint', 'application/mspowerpoint'],
  },
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

function hasPrefix(buffer: Buffer, prefix: Buffer): boolean {
  return buffer.length >= prefix.length && buffer.subarray(0, prefix.length).equals(prefix);
}

function mimeMatches(declaredMimeType: string, allowed: string[]): boolean {
  // Some browsers leave File.type blank for HEIC and TIFF. Native multipart
  // clients often send application/octet-stream. The verified byte signature
  // remains authoritative; only a conflicting non-generic MIME is rejected.
  const normalized = declaredMimeType.toLowerCase();
  return (
    normalized === '' ||
    normalized === 'application/octet-stream' ||
    normalized === 'binary/octet-stream' ||
    allowed.includes(normalized)
  );
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

function latinWindow(buffer: Buffer): string {
  const head = buffer.subarray(0, Math.min(buffer.length, 32_768)).toString('latin1');
  const tailStart = Math.max(0, buffer.length - 65_536);
  const tail = buffer.subarray(tailStart).toString('latin1');
  return head + tail;
}

function sniffOpenXml(buffer: Buffer): keyof typeof OFFICE_XML | null {
  if (!hasPrefix(buffer, Buffer.from('PK'))) return null;
  const hay = latinWindow(buffer);
  if (hay.includes('word/document')) return 'docx';
  if (hay.includes('xl/workbook')) return 'xlsx';
  if (hay.includes('ppt/presentation')) return 'pptx';
  return null;
}

function fileNameKind(fileName: string | undefined): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName || '');
  return match ? match[1].toLowerCase() : '';
}

function sniffOle(buffer: Buffer, declaredMimeType: string, fileName?: string): keyof typeof OFFICE_OLE | null {
  if (!hasPrefix(buffer, OLE_SIGNATURE)) return null;
  const ext = fileNameKind(fileName);
  if (ext === 'doc' || ext === 'xls' || ext === 'ppt') return ext;
  const mime = declaredMimeType.toLowerCase();
  if (OFFICE_OLE.doc.mimes.includes(mime)) return 'doc';
  if (OFFICE_OLE.xls.mimes.includes(mime)) return 'xls';
  if (OFFICE_OLE.ppt.mimes.includes(mime)) return 'ppt';
  return null;
}

/**
 * Identifies only the formats the service accepts. Browser-supplied MIME types
 * and file extensions are metadata, not proof of a file's actual content.
 */
export function verifyUploadSignature(
  buffer: Buffer,
  declaredMimeType: string,
  fileName?: string,
): VerifiedUpload | null {
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

  const openXml = sniffOpenXml(buffer);
  if (openXml) {
    const spec = OFFICE_XML[openXml];
    const ext = fileNameKind(fileName);
    const declaredExtOk = !ext || ext === spec.extension || ext === spec.extension.replace('x', '');
    return mimeMatches(declaredMimeType, spec.mimes) && declaredExtOk
      ? { mimeType: spec.mimeType, extension: spec.extension }
      : null;
  }

  const ole = sniffOle(buffer, declaredMimeType, fileName);
  if (ole) {
    const spec = OFFICE_OLE[ole];
    return mimeMatches(declaredMimeType, spec.mimes)
      ? { mimeType: spec.mimeType, extension: spec.extension }
      : null;
  }

  return null;
}
