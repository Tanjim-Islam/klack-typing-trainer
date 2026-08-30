"use client";

import { useId, useRef, useState } from "react";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { MODE_LABELS, type TestResult } from "@/lib/types";

const W = 720;
const H = 260;
const PAD = { top: 18, right: 14, bottom: 30, left: 42 };

function errorsIn(result: TestResult): number {
  return Math.max(0, result.keystrokes - result.correctKeystrokes);
}

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
  const previous = hover !== null && hover > 0 ? series[hover - 1] : null;
  const change = active && previous ? active.wpm - previous.wpm : null;
  const peakBurst =
    active && active.performance.burst.length > 0
      ? Math.max(...active.performance.burst)
      : null;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = ratio * W;
    const index = Math.round(((x - PAD.left) / plotW) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, index)));
  };

  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    let next = hover ?? series.length - 1;
    if (event.key === "ArrowLeft") next--;
    else if (event.key === "ArrowRight") next++;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = series.length - 1;
    else return;
    event.preventDefault();
    setHover(Math.max(0, Math.min(series.length - 1, next)));
  };

  const activeX = hover === null ? 0 : xFor(hover);
  const activeY = active ? yFor(active.wpm) : 0;

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          role="img"
          tabIndex={0}
          aria-label={`Words per minute across your last ${series.length} tests. Use the pointer or arrow keys for point details. Speeds range from ${formatDecimal(
            Math.min(...wpms),
            0,
          )} to ${formatDecimal(max, 0)}`}
          onFocus={() => setHover((current) => current ?? series.length - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={onKeyDown}
          onPointerDown={onMove}
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
          <g className="pointer-events-none">
            <line
              x1={activeX}
              x2={activeX}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--ink-faint)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <circle
              cx={activeX}
              cy={activeY}
              r="5"
              fill="var(--chart-1)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
            <circle
              cx={activeX}
              cy={yFor((active.accuracy / 100) * yMax)}
              r="3.5"
              fill="var(--chart-2)"
              stroke="var(--surface)"
              strokeWidth="1.5"
            />
          </g>
        ) : null}
        </svg>

        {active ? (
          <div
            aria-hidden
            className={`pointer-events-none absolute top-1/2 z-10 w-48 -translate-y-1/2 rounded-md border border-line bg-raised/98 p-2.5 font-mono shadow-lg ${
              activeX > W / 2 ? "-ml-2 -translate-x-full" : "ml-2"
            }`}
            style={{ left: `${(activeX / W) * 100}%` }}
          >
            <p className="truncate text-[0.6875rem] font-semibold text-ink">
              {MODE_LABELS[active.mode]} / {active.label}
            </p>
            <p className="mb-2 mt-0.5 text-[0.625rem] text-ink-faint">
              {formatDateTime(active.at)}
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.625rem] leading-tight">
              {[
                ["WPM", formatDecimal(active.wpm), "bg-chart-1"],
                ["Raw", formatDecimal(active.rawWpm), "bg-chart-2"],
                ["Accuracy", `${formatDecimal(active.accuracy)}%`, "bg-ink-soft"],
                ["Peak burst", peakBurst === null ? "-" : formatDecimal(peakBurst), "bg-ink-faint"],
                ["Errors", String(errorsIn(active)), "bg-danger"],
                [
                  "Change",
                  change === null
                    ? "First test"
                    : `${change >= 0 ? "+" : ""}${formatDecimal(change)} wpm`,
                  change !== null && change < 0 ? "bg-danger" : "bg-success",
                ],
              ].map(([label, value, color]) => (
                <div key={label} className="contents">
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <span className={`size-1.5 rounded-sm ${color}`} />
                    {label}
                  </span>
                  <span className="text-right font-semibold text-ink tnum">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

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

        <span className="min-h-5 font-mono text-xs text-ink-faint tnum">
          Hover or use arrow keys for test details
        </span>
        <span aria-live="polite" className="sr-only">
          {active
            ? `${formatDecimal(active.wpm)} words per minute, ${formatDecimal(active.rawWpm)} raw, ${formatDecimal(active.accuracy)}% accuracy, ${errorsIn(active)} ${errorsIn(active) === 1 ? "error" : "errors"}, ${active.label}, ${formatDateTime(active.at)}`
            : "No test selected"}
        </span>
      </figcaption>
    </figure>
  );
}
