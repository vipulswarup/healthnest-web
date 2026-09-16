export type Point = { x: number; y: number };

export type Quad = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function scaleQuad(quad: Quad, scaleX: number, scaleY: number): Quad {
  const scale = (point: Point): Point => ({ x: point.x * scaleX, y: point.y * scaleY });
  return { tl: scale(quad.tl), tr: scale(quad.tr), br: scale(quad.br), bl: scale(quad.bl) };
}

export function shoelace(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

export function defaultPageQuad(width: number, height: number): Quad {
  const insetX = width * 0.08;
  const insetY = height * 0.08;
  return {
    tl: { x: insetX, y: insetY },
    tr: { x: width - insetX, y: insetY },
    br: { x: width - insetX, y: height - insetY },
    bl: { x: insetX, y: height - insetY },
  };
}

export function containedRect(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function quadrantCorners(points: Point[]): Quad | null {
  if (points.length < 4) return null;
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length;
  cy /= points.length;
  const center = { x: cx, y: cy };

  let tl: Point | null = null;
  let tr: Point | null = null;
  let br: Point | null = null;
  let bl: Point | null = null;
  let tlDist = -1;
  let trDist = -1;
  let brDist = -1;
  let blDist = -1;

  for (const point of points) {
    const distance = dist(point, center);
    if (point.x <= cx && point.y <= cy) {
      if (distance > tlDist) {
        tl = point;
        tlDist = distance;
      }
    } else if (point.x >= cx && point.y <= cy) {
      if (distance > trDist) {
        tr = point;
        trDist = distance;
      }
    } else if (point.x >= cx && point.y >= cy) {
      if (distance > brDist) {
        br = point;
        brDist = distance;
      }
    } else if (distance > blDist) {
      bl = point;
      blDist = distance;
    }
  }

  if (!tl || !tr || !br || !bl) return null;
  return { tl, tr, br, bl };
}

export function quadLooksLikePage(quad: Quad, width: number, height: number): boolean {
  const points = [quad.tl, quad.tr, quad.br, quad.bl];
  const area = shoelace(points);
  const frame = width * height;
  if (area < frame * 0.08 || area > frame * 0.99) return false;
  const top = dist(quad.tl, quad.tr);
  const bottom = dist(quad.bl, quad.br);
  const left = dist(quad.tl, quad.bl);
  const right = dist(quad.tr, quad.br);
  const minSide = Math.min(top, bottom, left, right);
  if (minSide < Math.min(width, height) * 0.08) return false;
  const aspect = ((top + bottom) / 2) / Math.max(1, (left + right) / 2);
  return aspect > 0.28 && aspect < 3.6;
}
