export const ACCEPTED_HEALTH_FILES =
  '.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.heic,.heif,.avif,.gif,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

const IMAGE_OR_PDF_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tif',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp',
]);

const OFFICE_MIME = new Set([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const NAME_OK = /\.(pdf|jpe?g|png|webp|tiff?|heic|heif|avif|gif|bmp|docx?|xlsx?|pptx?)$/i;
const OFFICE_NAME = /\.(docx?|xlsx?|pptx?)$/i;

export function isOfficeFile(file: File): boolean {
  return OFFICE_MIME.has(file.type.toLowerCase()) || OFFICE_NAME.test(file.name);
}

export function assertAllowedHealthFile(file: File, maxBytes = 50 * 1024 * 1024): void {
  const mime = file.type.toLowerCase();
  if (!IMAGE_OR_PDF_MIME.has(mime) && !OFFICE_MIME.has(mime) && !NAME_OK.test(file.name)) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${file.name} exceeds the 50MB limit`);
  }
}
