import {
  containedRect,
  quadrantCorners,
  quadLooksLikePage,
  shoelace,
  type Point,
  type Quad,
} from '@/lib/scan/geometry';

function toGray(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    const offset = i * 4;
    gray[i] = 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];
  }
  return gray;
}

function gaussian3(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const value =
        gray[i - width - 1] + 2 * gray[i - width] + gray[i - width + 1]
        + 2 * gray[i - 1] + 4 * gray[i] + 2 * gray[i + 1]
        + gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      out[i] = value / 16;
    }
  }
  return out;
}

function canny(gray: Uint8Array, width: number, height: number): Uint8Array {
  const blurred = gaussian3(gray, width, height);
  const mag = new Float32Array(gray.length);
  const dir = new Uint8Array(gray.length);
  let maxMag = 1;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -blurred[i - width - 1] + blurred[i - width + 1]
        - 2 * blurred[i - 1] + 2 * blurred[i + 1]
        - blurred[i + width - 1] + blurred[i + width + 1];
      const gy =
        -blurred[i - width - 1] - 2 * blurred[i - width] - blurred[i - width + 1]
        + blurred[i + width - 1] + 2 * blurred[i + width] + blurred[i + width + 1];
      const length = Math.hypot(gx, gy);
      mag[i] = length;
      if (length > maxMag) maxMag = length;
      const angle = (Math.atan2(gy, gx) * 180) / Math.PI;
      const abs = angle < 0 ? angle + 180 : angle;
      dir[i] = abs < 22.5 || abs >= 157.5 ? 0 : abs < 67.5 ? 45 : abs < 112.5 ? 90 : 135;
    }
  }

  const nms = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      let a = 0;
      let b = 0;
      if (dir[i] === 0) {
        a = mag[i - 1];
        b = mag[i + 1];
      } else if (dir[i] === 45) {
        a = mag[i - width + 1];
        b = mag[i + width - 1];
      } else if (dir[i] === 90) {
        a = mag[i - width];
        b = mag[i + width];
      } else {
        a = mag[i - width - 1];
        b = mag[i + width + 1];
      }
      nms[i] = mag[i] >= a && mag[i] >= b ? (mag[i] / maxMag) * 255 : 0;
    }
  }

  const high = 90;
  const low = 30;
  const out = new Uint8Array(gray.length);
  const stack: number[] = [];
  for (let i = 0; i < nms.length; i += 1) {
    if (nms[i] >= high) {
      out[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % width;
    const y = (i / width) | 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
        const j = ny * width + nx;
        if (out[j] || nms[j] < low) continue;
        out[j] = 1;
        stack.push(j);
      }
    }
  }
  return out;
}

function dilate(binary: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (binary[(y + dy) * width + (x + dx)]) {
            on = 1;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];

function traceContour(binary: Uint8Array, width: number, height: number, startX: number, startY: number, seen: Uint8Array): Point[] {
  const points: Point[] = [];
  let x = startX;
  let y = startY;
  let dir = 0;
  for (let step = 0; step < width * height; step += 1) {
    points.push({ x, y });
    seen[y * width + x] = 1;
    let found = false;
    for (let i = 0; i < 8; i += 1) {
      const nextDir = (dir + 6 + i) % 8;
      const nx = x + DX[nextDir];
      const ny = y + DY[nextDir];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!binary[ny * width + nx]) continue;
      x = nx;
      y = ny;
      dir = nextDir;
      found = true;
      break;
    }
    if (!found) break;
    if (x === startX && y === startY && points.length > 8) break;
  }
  return points;
}

function largestContour(binary: Uint8Array, width: number, height: number): Point[] | null {
  const seen = new Uint8Array(binary.length);
  let best: Point[] | null = null;
  let bestArea = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (!binary[i] || binary[i - 1] || seen[i]) continue;
      const contour = traceContour(binary, width, height, x, y, seen);
      if (contour.length < 20) continue;
      const area = shoelace(contour);
      if (area > bestArea) {
        bestArea = area;
        best = contour;
      }
    }
  }
  return best;
}

export function detectDocumentQuad(image: ImageData): Quad | null {
  const { width, height, data } = image;
  if (width < 32 || height < 32) return null;
  const edges = dilate(canny(toGray(data, width, height), width, height), width, height);
  const contour = largestContour(edges, width, height);
  if (!contour) return null;
  const quad = quadrantCorners(contour);
  if (!quad || !quadLooksLikePage(quad, width, height)) return null;
  return quad;
}

export function drawQuadOverlay(
  canvas: HTMLCanvasElement,
  quad: Quad | null,
  detectWidth: number,
  detectHeight: number,
  contentWidth: number,
  contentHeight: number,
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!quad) return;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth < 8 || cssHeight < 8) return;
  const box = containedRect(cssWidth, cssHeight, contentWidth, contentHeight);
  const ratio = canvas.width / cssWidth;
  context.strokeStyle = '#34d399';
  context.lineWidth = Math.max(3, canvas.width / 180);
  const map = (point: { x: number; y: number }) => ({
    x: (box.x + (point.x / detectWidth) * box.width) * ratio,
    y: (box.y + (point.y / detectHeight) * box.height) * ratio,
  });
  const tl = map(quad.tl);
  const tr = map(quad.tr);
  const br = map(quad.br);
  const bl = map(quad.bl);
  context.beginPath();
  context.moveTo(tl.x, tl.y);
  context.lineTo(tr.x, tr.y);
  context.lineTo(br.x, br.y);
  context.lineTo(bl.x, bl.y);
  context.closePath();
  context.stroke();
}
