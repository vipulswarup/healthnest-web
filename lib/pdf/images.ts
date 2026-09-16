export async function fileToJpegBytes(
  file: Blob,
  maxEdge = 2000,
  quality = 0.82,
  rotation: 0 | 90 | 180 | 270 = 0,
): Promise<Uint8Array> {
  const bitmap = await decodeImage(file);
  const edge = Math.max(bitmap.width, bitmap.height);
  const scale = edge > maxEdge ? maxEdge / edge : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not read this image');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const output = rotateCanvas(canvas, rotation);

  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not convert this image'))),
      'image/jpeg',
      quality,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadHtmlImage(url);
      return await createImageBitmap(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image format cannot be opened in the browser'));
    image.src = url;
  });
}

export function rotateCanvas(source: HTMLCanvasElement, rotation: 0 | 90 | 180 | 270): HTMLCanvasElement {
  if (!rotation) return source;
  const swapped = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swapped ? source.height : source.width;
  canvas.height = swapped ? source.width : source.height;
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
