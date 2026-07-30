"use client";

import { useId } from "react";

/**
 * Per-second WPM for a single test. Deliberately axis-free: the shape of the
 * run is the point, and the exact numbers live in the stat tiles beside it.
 */
export function Sparkline({
  values,
  height = 64,
  className,
  label,
}: {
  values: number[];
  height?: number;
  className?: string;
  label: string;
}) {
  const gradientId = useId();
  const width = 320;
  const pad = 4;

  if (values.length < 2) {
    return (
      <div
        className={className}
        style={{ height }}
        role="img"
        aria-label={`${label}: not enough data to plot`}
      >
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-line text-xs text-ink-faint">
          Too short to plot
        </div>
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = `M${points.join("L")}`;
  const area = `${line}L${width - pad},${height - pad}L${pad},${height - pad}Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height }}
      role="img"
      aria-label={`${label}: peaked at ${Math.round(max)} words per minute`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
