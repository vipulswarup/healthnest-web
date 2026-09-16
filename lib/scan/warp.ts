import { dist, type Point, type Quad } from '@/lib/scan/geometry';

function solveHomography(source: Point[], dest: Point[]): Float64Array {
  const matrix = Array.from({ length: 8 }, () => new Float64Array(9));
  for (let i = 0; i < 4; i += 1) {
    const s = source[i];
    const d = dest[i];
    const rowX = i * 2;
    const rowY = rowX + 1;
    matrix[rowX][0] = d.x;
    matrix[rowX][1] = d.y;
    matrix[rowX][2] = 1;
    matrix[rowX][6] = -s.x * d.x;
    matrix[rowX][7] = -s.x * d.y;
    matrix[rowX][8] = s.x;
    matrix[rowY][3] = d.x;
    matrix[rowY][4] = d.y;
    matrix[rowY][5] = 1;
    matrix[rowY][6] = -s.y * d.x;
    matrix[rowY][7] = -s.y * d.y;
    matrix[rowY][8] = s.y;
  }

  for (let col = 0; col < 8; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 8; row += 1) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    }
    const swap = matrix[col];
    matrix[col] = matrix[pivot];
    matrix[pivot] = swap;
    const diagonal = matrix[col][col];
    if (Math.abs(diagonal) < 1e-9) throw new Error('Could not straighten this page');
    for (let j = col; j < 9; j += 1) matrix[col][j] /= diagonal;
    for (let row = 0; row < 8; row += 1) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let j = col; j < 9; j += 1) matrix[row][j] -= factor * matrix[col][j];
    }
  }

  const h = new Float64Array(9);
  for (let i = 0; i < 8; i += 1) h[i] = matrix[i][8];
  h[8] = 1;
  return h;
}

function sampleBilinear(pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number, dest: Uint8ClampedArray, offset: number) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    dest[offset] = 255;
    dest[offset + 1] = 255;
    dest[offset + 2] = 255;
    dest[offset + 3] = 255;
    return;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const dx = x - x0;
  const dy = y - y0;
  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;
  for (let c = 0; c < 3; c += 1) {
    const top = pixels[i00 + c] * (1 - dx) + pixels[i10 + c] * dx;
    const bottom = pixels[i01 + c] * (1 - dx) + pixels[i11 + c] * dx;
    dest[offset + c] = top * (1 - dy) + bottom * dy;
  }
  dest[offset + 3] = 255;
}

export function outputSizeForQuad(quad: Quad, maxEdge: number): { width: number; height: number } {
  const width = Math.max(dist(quad.tl, quad.tr), dist(quad.bl, quad.br));
  const height = Math.max(dist(quad.tl, quad.bl), dist(quad.tr, quad.br));
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return {
    width: Math.max(32, Math.round(width * scale)),
    height: Math.max(32, Math.round(height * scale)),
  };
}

export function warpQuad(source: ImageData, quad: Quad, outWidth: number, outHeight: number): ImageData {
  const h = solveHomography(
    [quad.tl, quad.tr, quad.br, quad.bl],
    [
      { x: 0, y: 0 },
      { x: outWidth, y: 0 },
      { x: outWidth, y: outHeight },
      { x: 0, y: outHeight },
    ],
  );
  const dest = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const denom = h[6] * x + h[7] * y + h[8];
      const sx = (h[0] * x + h[1] * y + h[2]) / denom;
      const sy = (h[3] * x + h[4] * y + h[5]) / denom;
      sampleBilinear(source.data, source.width, source.height, sx, sy, dest, (y * outWidth + x) * 4);
    }
  }
  return new ImageData(dest, outWidth, outHeight);
}
