"use client";

import { useId, useRef, useState } from "react";
import { formatDateTime, formatDecimal } from "@/lib/format";
import type { TestResult } from "@/lib/types";

const W = 720;
const H = 260;
const PAD = { top: 18, right: 14, bottom: 30, left: 42 };

/**
 * Speed over time, oldest test on the left. Hand-drawn SVG rather than a chart
 * library: two series and a crosshair is all this needs, and it keeps the
 * styling on the same design tokens as everything else.
 */
export function WpmChart({ results }: { results: TestResult[] }) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const series = [...results].sort((a, b) => a.at - b.at);
  const wpms = series.map((r) => r.wpm);
  const max = Math.max(...wpms, 10);
  const yMax = Math.ceil((max * 1.1) / 10) * 10;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xFor = (index: number) =>
    PAD.left + (series.length === 1 ? plotW / 2 : (index / (series.length - 1)) * plotW);
  const yFor = (value: number) => PAD.top + (1 - value / yMax) * plotH;

  const linePoints = series.map((r, i) => `${xFor(i).toFixed(2)},${yFor(r.wpm).toFixed(2)}`);
  const line = `M${linePoints.join("L")}`;
  const area = `${line}L${xFor(series.length - 1)},${PAD.top + plotH}L${xFor(0)},${
    PAD.top + plotH
  }Z`;

  const accuracyLine = `M${series
    .map((r, i) => `${xFor(i).toFixed(2)},${yFor((r.accuracy / 100) * yMax).toFixed(2)}`)
    .join("L")}`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));
  const active = hover !== null ? series[hover] : null;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = ratio * W;
    const index = Math.round(((x - PAD.left) / plotW) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, index)));
  };

  return (
    <figure className="m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y"
        role="img"
        aria-label={`Words per minute across your last ${series.length} tests, from ${formatDecimal(
          Math.min(...wpms),
          0,
        )} to ${formatDecimal(max, 0)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : "3 5"}
            />
            <text
              x={PAD.left - 10}
              y={yFor(tick) + 4}
              textAnchor="end"
              className="fill-[var(--ink-faint)] font-mono text-[11px]"
            >
              {tick}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={accuracyLine}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
        <path
          d={line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {series.length <= 40
          ? series.map((r, i) => (
              <circle
                key={r.id}
                cx={xFor(i)}
                cy={yFor(r.wpm)}
                r={hover === i ? 5 : 3}
                fill="var(--surface)"
                stroke="var(--chart-1)"
                strokeWidth="2"
              />
            ))
          : null}

        {active && hover !== null ? (
          <g>
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--ink-faint)"
              strokeWidth="1"
            />
            <circle
              cx={xFor(hover)}
              cy={yFor(active.wpm)}
              r="5"
              fill="var(--chart-1)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </g>
        ) : null}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="h-0.5 w-4 rounded-full bg-chart-1" aria-hidden />
            Words per minute
          </span>
          <span className="flex items-center gap-2 text-xs text-ink-soft">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded-full bg-chart-2 opacity-80"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--chart-2) 0 4px, transparent 4px 8px)",
              }}
            />
            Accuracy, scaled
          </span>
        </div>

        <span
          aria-live="polite"
          className="min-h-5 font-mono text-xs text-ink-soft tnum"
        >
          {active
            ? `${formatDecimal(active.wpm)} wpm - ${formatDecimal(
                active.accuracy,
              )}% - ${active.label} - ${formatDateTime(active.at)}`
            : "Hover the line for test details"}
        </span>
      </figcaption>
    </figure>
  );
}
