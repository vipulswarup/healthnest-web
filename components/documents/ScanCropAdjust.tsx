'use client';

import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { containedRect, type Quad } from '@/lib/scan/geometry';

const HANDLES: Array<keyof Quad> = ['tl', 'tr', 'br', 'bl'];

export function ScanCropAdjust({
  src,
  width,
  height,
  quad,
  onChange,
}: {
  src: string;
  width: number;
  height: number;
  quad: Quad;
  onChange: (quad: Quad) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<keyof Quad | null>(null);
  const [box, setBox] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [frameSize, setFrameSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
      setBox(containedRect(frame.clientWidth, frame.clientHeight, width, height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width, height]);

  const pointFromEvent = (event: PointerEvent<HTMLElement>) => {
    const frame = frameRef.current;
    if (!frame) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    const x = ((event.clientX - rect.left - box.x) / box.width) * width;
    const y = ((event.clientY - rect.top - box.y) / box.height) * height;
    return {
      x: Math.min(width - 1, Math.max(0, x)),
      y: Math.min(height - 1, Math.max(0, y)),
    };
  };

  const onPointerDown = (corner: keyof Quad) => (event: PointerEvent<HTMLButtonElement>) => {
    dragging.current = corner;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    const point = pointFromEvent(event);
    onChange({ ...quad, [dragging.current]: point });
  };

  const onPointerUp = () => {
    dragging.current = null;
  };

  return (
    <div
      ref={frameRef}
      className="relative max-h-[70vh] min-h-48 w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Captured page" className="absolute inset-0 h-full w-full object-contain" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${frameSize.width} ${frameSize.height}`} preserveAspectRatio="none">
        <polygon
          points={HANDLES.map((corner) => {
            const x = box.x + (quad[corner].x / width) * box.width;
            const y = box.y + (quad[corner].y / height) * box.height;
            return `${x},${y}`;
          }).join(' ')}
          fill="rgba(52,211,153,0.12)"
          stroke="#34d399"
          strokeWidth="3"
        />
      </svg>
      {HANDLES.map((corner) => (
        <button
          key={corner}
          type="button"
          aria-label={`Move ${corner} corner`}
          className="absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-coral touch-none"
          style={{
            left: box.x + (quad[corner].x / width) * box.width,
            top: box.y + (quad[corner].y / height) * box.height,
          }}
          onPointerDown={onPointerDown(corner)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ))}
    </div>
  );
}
