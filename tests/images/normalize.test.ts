import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { normalizeImageToJpeg } from '../../lib/images/normalize';

for (const format of ['png', 'webp', 'tiff', 'gif'] as const) {
  test(`normalizes ${format.toUpperCase()} images to a bounded JPEG`, async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })[format]().toBuffer();

    const output = await normalizeImageToJpeg(source, `image/${format}`, 800);
    const metadata = await sharp(output).metadata();

    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 400);
  });
}
