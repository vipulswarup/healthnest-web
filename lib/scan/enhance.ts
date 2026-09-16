export type ScanFilter = 'enhance' | 'photo' | 'bw';

function toGray(pixels: Uint8ClampedArray, index: number): number {
  return 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
}

function boxBlurGray(gray: Float32Array, width: number, height: number, radius: number): Float32Array {
  const stride = width + 1;
  const sat = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += gray[(y - 1) * width + (x - 1)];
      sat[y * stride + x] = sat[(y - 1) * stride + x] + row;
    }
  }
  const out = new Float32Array(gray.length);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius) + 1;
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius) + 1;
      const area = (x1 - x0) * (y1 - y0);
      const sum = sat[y1 * stride + x1] - sat[y0 * stride + x1] - sat[y1 * stride + x0] + sat[y0 * stride + x0];
      out[y * width + x] = sum / area;
    }
  }
  return out;
}

function percentile(values: Float32Array, p: number): number {
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(values.length / 4000));
  for (let i = 0; i < values.length; i += step) sample.push(values[i]);
  sample.sort((a, b) => a - b);
  const index = Math.min(sample.length - 1, Math.max(0, Math.round((sample.length - 1) * p)));
  return sample[index];
}

function writeGray(dest: Uint8ClampedArray, gray: Float32Array) {
  for (let i = 0; i < gray.length; i += 1) {
    const value = Math.max(0, Math.min(255, gray[i]));
    const offset = i * 4;
    dest[offset] = value;
    dest[offset + 1] = value;
    dest[offset + 2] = value;
    dest[offset + 3] = 255;
  }
}

function enhanceContrast(pixels: Uint8ClampedArray, width: number, height: number): ImageData {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) gray[i] = toGray(pixels, i * 4);
  const low = percentile(gray, 0.02);
  const high = Math.max(low + 8, percentile(gray, 0.98));
  const scale = 255 / (high - low);
  for (let i = 0; i < gray.length; i += 1) gray[i] = (gray[i] - low) * scale;
  const blurred = boxBlurGray(gray, width, height, 1);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = gray[i] + 0.7 * (gray[i] - blurred[i]);
  }
  const dest = new Uint8ClampedArray(pixels.length);
  writeGray(dest, gray);
  return new ImageData(dest, width, height);
}

function blackAndWhite(pixels: Uint8ClampedArray, width: number, height: number): ImageData {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) gray[i] = toGray(pixels, i * 4);
  const radius = Math.max(10, Math.round(Math.min(width, height) / 36));
  const local = boxBlurGray(gray, width, height, radius);
  const dest = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < gray.length; i += 1) {
    const value = gray[i] < local[i] * 0.92 ? 0 : 255;
    const offset = i * 4;
    dest[offset] = value;
    dest[offset + 1] = value;
    dest[offset + 2] = value;
    dest[offset + 3] = 255;
  }
  return new ImageData(dest, width, height);
}

export function applyScanFilter(image: ImageData, filter: ScanFilter): ImageData {
  if (filter === 'photo') return image;
  if (filter === 'bw') return blackAndWhite(image.data, image.width, image.height);
  return enhanceContrast(image.data, image.width, image.height);
}
