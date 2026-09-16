'use client';

import { useMemo } from 'react';
import { formatCalendarDate, type GrowthMeasurement } from '@/lib/vitals/growth';

type ChartPoint = { date: string; value: number };

function shortDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
}

function buildSeries(
  measurements: GrowthMeasurement[],
  valueOf: (measurement: GrowthMeasurement) => number | null,
): ChartPoint[] {
  return [...measurements]
    .reverse()
    .map((measurement) => ({ date: measurement.calendarDate, value: valueOf(measurement) }))
    .filter((point): point is ChartPoint => point.value !== null && Number.isFinite(point.value));
}

function LineChart({
  title,
  unit,
  points,
  color,
}: {
  title: string;
  unit: string;
  points: ChartPoint[];
  color: string;
}) {
  const width = 320;
  const height = 140;
  const padX = 28;
  const padY = 18;

  const { path, dots, yLabels, latestLabel } = useMemo(() => {
    if (points.length === 0) {
      return { path: '', dots: [] as Array<{ x: number; y: number }>, yLabels: [] as string[], latestLabel: null };
    }

    const values = points.map((point) => point.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;

    const plotW = width - padX * 2;
    const plotH = height - padY * 2;
    const xAt = (index: number) => padX + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
    const yAt = (value: number) => padY + plotH - ((value - min) / (max - min)) * plotH;

    const coords = points.map((point, index) => ({ x: xAt(index), y: yAt(point.value), value: point.value }));
    const pathData = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const latest = points[points.length - 1];

    return {
      path: pathData,
      dots: coords,
      yLabels: [max, min].map((value) => `${Math.round(value * 10) / 10}`),
      latestLabel: `${latest.value} ${unit} · ${shortDate(latest.date)}`,
    };
  }, [points, unit]);

  if (points.length < 2) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-950">{title}</h3>
        {latestLabel ? <p className="text-sm text-gray-600">{latestLabel}</p> : null}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img" aria-label={`${title} trend`}>
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#e5e7eb" strokeWidth="1" />
        {yLabels[0] ? (
          <text x={4} y={padY + 4} className="fill-gray-500 text-[10px]">
            {yLabels[0]}
          </text>
        ) : null}
        {yLabels[1] ? (
          <text x={4} y={height - padY} className="fill-gray-500 text-[10px]">
            {yLabels[1]}
          </text>
        ) : null}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {dots.map((dot, index) => (
          <circle key={`${dot.x}-${dot.y}-${index}`} cx={dot.x} cy={dot.y} r="3.5" fill={color} />
        ))}
        <text x={padX} y={height - 4} className="fill-gray-500 text-[10px]">
          {shortDate(points[0].date)}
        </text>
        <text x={width - padX} y={height - 4} textAnchor="end" className="fill-gray-500 text-[10px]">
          {shortDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

export function GrowthTrendChart({ measurements }: { measurements: GrowthMeasurement[] }) {
  const heightPoints = useMemo(
    () => buildSeries(measurements, (measurement) => measurement.heightCm),
    [measurements],
  );
  const weightPoints = useMemo(
    () => buildSeries(measurements, (measurement) => measurement.weightKg),
    [measurements],
  );

  const hasHeightTrend = heightPoints.length >= 2;
  const hasWeightTrend = weightPoints.length >= 2;

  if (!hasHeightTrend && !hasWeightTrend) {
    const singles = measurements.filter(
      (measurement) => measurement.heightCm !== null || measurement.weightKg !== null,
    );
    if (singles.length === 0) return null;

    return (
      <p className="text-base text-gray-600">
        Log at least two measurements to see height and weight trends.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasHeightTrend ? (
        <LineChart title="Height" unit="cm" points={heightPoints} color="#EF8354" />
      ) : heightPoints.length === 1 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          Height: {heightPoints[0].value} cm on {formatCalendarDate(heightPoints[0].date)}. Add one more entry for a trend line.
        </p>
      ) : null}
      {hasWeightTrend ? (
        <LineChart title="Weight" unit="kg" points={weightPoints} color="#059669" />
      ) : weightPoints.length === 1 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          Weight: {weightPoints[0].value} kg on {formatCalendarDate(weightPoints[0].date)}. Add one more entry for a trend line.
        </p>
      ) : null}
    </div>
  );
}
