import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyUploadSignature } from '../../lib/security/file-signature';

test('accepts correctly declared PDF and JPEG content', () => {
  assert.deepEqual(verifyUploadSignature(Buffer.from('%PDF-1.7'), 'application/pdf'), {
    extension: 'pdf', mimeType: 'application/pdf',
  });
  assert.deepEqual(verifyUploadSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'), {
    extension: 'jpg', mimeType: 'image/jpeg',
  });
});

test('accepts generic octet-stream MIME when bytes match an allowed type', () => {
  assert.deepEqual(verifyUploadSignature(Buffer.from('%PDF-1.7'), 'application/octet-stream'), {
    extension: 'pdf', mimeType: 'application/pdf',
  });
  assert.deepEqual(verifyUploadSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'application/octet-stream'), {
    extension: 'jpg', mimeType: 'image/jpeg',
  });
});

test('accepts common raster formats by signature', () => {
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
  const littleEndianTiff = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(8)]);
  const avif = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypavif'), Buffer.alloc(8)]);
  const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(8)]);
  const bmp = Buffer.concat([Buffer.from('BM'), Buffer.alloc(12)]);

  assert.deepEqual(verifyUploadSignature(webp, 'image/webp'), {
    extension: 'webp', mimeType: 'image/webp',
  });
  assert.deepEqual(verifyUploadSignature(littleEndianTiff, 'image/tiff'), {
    extension: 'tif', mimeType: 'image/tiff',
  });
  assert.deepEqual(verifyUploadSignature(heic, 'image/heic'), {
    extension: 'heic', mimeType: 'image/heic',
  });
  assert.deepEqual(verifyUploadSignature(heic, ''), {
    extension: 'heic', mimeType: 'image/heic',
  });
  assert.deepEqual(verifyUploadSignature(avif, 'image/avif'), {
    extension: 'avif', mimeType: 'image/avif',
  });
  assert.deepEqual(verifyUploadSignature(gif, 'image/gif'), {
    extension: 'gif', mimeType: 'image/gif',
  });
  assert.deepEqual(verifyUploadSignature(bmp, 'image/bmp'), {
    extension: 'bmp', mimeType: 'image/bmp',
  });
});

test('rejects spoofed, mismatched, and unsupported upload content', () => {
  assert.equal(verifyUploadSignature(Buffer.from('<script>alert(1)</script>'), 'application/pdf'), null);
  assert.equal(verifyUploadSignature(Buffer.from('%PDF-1.7'), 'image/png'), null);
  assert.equal(verifyUploadSignature(Buffer.from([0x00, 0x01, 0x02]), 'image/jpeg'), null);
  assert.equal(verifyUploadSignature(Buffer.from('PK\x03\x04not-office'), 'application/zip'), null);
});

test('accepts Office Open XML by zip contents', () => {
  const docx = Buffer.concat([
    Buffer.from('PK\x03\x04'),
    Buffer.from('word/document.xml[Content_Types].xml'),
  ]);
  assert.deepEqual(verifyUploadSignature(docx, 'application/octet-stream', 'report.docx'), {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
});

test('accepts legacy OLE Office files when the name or MIME is Office', () => {
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
  assert.deepEqual(verifyUploadSignature(ole, 'application/msword', 'letter.doc'), {
    extension: 'doc',
    mimeType: 'application/msword',
  });
  assert.equal(verifyUploadSignature(ole, 'application/octet-stream'), null);
});
