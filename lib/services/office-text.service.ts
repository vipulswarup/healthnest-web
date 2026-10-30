import JSZip from 'jszip';

const OFFICE_XML_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const OFFICE_OLE_MIME = new Set([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
]);

export function isOfficeMime(mime: string): boolean {
  const normalized = mime.toLowerCase();
  return OFFICE_XML_MIME.has(normalized) || OFFICE_OLE_MIME.has(normalized);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function xmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\b[^/]*\/>/gi, '\t')
    .replace(/<w:br\b[^/]*\/>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/a:p>/gi, '\n')
    .replace(/<\/p>/gi, '\n');
  return decodeXmlEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function textFromZipPaths(buffer: Buffer, matcher: (name: string) => boolean): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const chunks: string[] = [];
  const names = Object.keys(zip.files).sort();
  for (const name of names) {
    if (!matcher(name) || zip.files[name].dir) continue;
    const xml = await zip.files[name].async('string');
    const text = xmlToText(xml);
    if (text) chunks.push(text);
  }
  return chunks.join('\n').trim();
}

function oleStrings(buffer: Buffer): string {
  const texts: string[] = [];
  let ascii = '';
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    if (byte >= 32 && byte <= 126) {
      ascii += String.fromCharCode(byte);
      continue;
    }
    if (ascii.length >= 6) texts.push(ascii);
    ascii = '';
  }
  if (ascii.length >= 6) texts.push(ascii);

  let utf16 = '';
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const code = buffer[i] | (buffer[i + 1] << 8);
    if (code >= 32 && code <= 126) {
      utf16 += String.fromCharCode(code);
      continue;
    }
    if (utf16.length >= 6) texts.push(utf16);
    utf16 = '';
  }
  if (utf16.length >= 6) texts.push(utf16);

  return [...new Set(texts)]
    .filter((value) => /[A-Za-z]{3,}/.test(value))
    .join('\n')
    .trim();
}

export async function extractOfficeText(buffer: Buffer, mimeType: string): Promise<string> {
  const mime = mimeType.toLowerCase();
  if (mime.includes('wordprocessingml')) {
    return textFromZipPaths(buffer, (name) => /^word\/(document|header\d*|footer\d*)\.xml$/i.test(name));
  }
  if (mime.includes('spreadsheetml')) {
    return textFromZipPaths(buffer, (name) => /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/i.test(name));
  }
  if (mime.includes('presentationml')) {
    return textFromZipPaths(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
  }
  if (OFFICE_OLE_MIME.has(mime)) {
    return oleStrings(buffer);
  }
  return '';
}
