import { canvasToJpeg, getPdfPageCount, renderPdfPage } from '@/lib/pdf/inspect';
import { fileToJpegBytes } from '@/lib/pdf/images';
import {
  addWatermark,
  createCoverPdf,
  encryptPdf,
  imagesToPdf,
  isPdfHeader,
  mergePdfBytes,
  pdfFile,
} from '@/lib/pdf/ops';

export type ShareDocument = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

export type CoverSpec = {
  title: string;
  identityLine: string;
  sections: Array<{ heading: string; lines: string[] }>;
};

export async function documentsToPdf(documents: ShareDocument[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for (const document of documents) {
    if (document.mimeType === 'application/pdf' || isPdfHeader(document.bytes) || /\.pdf$/i.test(document.fileName)) {
      parts.push(document.bytes);
      continue;
    }
    const jpeg = await fileToJpegBytes(new Blob([document.bytes as BlobPart], { type: document.mimeType || 'image/jpeg' }));
    parts.push(await imagesToPdf([{ bytes: jpeg, mime: 'image/jpeg' }]));
  }
  if (parts.length === 0) throw new Error('No documents to share');
  return parts.length === 1 ? parts[0] : mergePdfBytes(parts);
}

export async function assembleSharePdf(options: {
  documents: ShareDocument[];
  cover?: CoverSpec;
}): Promise<Uint8Array> {
  const cover = options.cover
    ? await createCoverPdf(options.cover.title, options.cover.identityLine, options.cover.sections)
    : null;
  const body = options.documents.length > 0 ? await documentsToPdf(options.documents) : null;
  if (cover && body) return mergePdfBytes([cover, body]);
  if (cover) return cover;
  if (body) return body;
  throw new Error('No documents to share');
}

export async function buildShareCopy(options: {
  documents: ShareDocument[];
  cover?: CoverSpec;
  watermark?: string;
  password?: string;
  fileName: string;
}): Promise<File> {
  let bytes = await assembleSharePdf({ documents: options.documents, cover: options.cover });
  if (options.watermark) {
    bytes = await addWatermark(bytes, options.watermark);
  }
  if (options.password?.trim()) {
    bytes = await encryptPdf(bytes, options.password.trim());
  }
  return pdfFile(bytes, options.fileName);
}
