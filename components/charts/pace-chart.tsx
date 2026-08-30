"use client";

import { useId, useRef, useState } from "react";
import { formatDecimal, formatInt } from "@/lib/format";
import type { TestResult } from "@/lib/types";

const W = 560;
const H = 190;
const PAD = { top: 14, right: 18, bottom: 24, left: 34 };

interface PacePoint {
  elapsedMs: number;
  wpm: number;
  rawWpm: number | null;
  burst: number | null;
  errors: number | null;
}

function pointsFor(result: TestResult): PacePoint[] {
  if (result.performance.wpm.length > 0) {
    return result.performance.wpm.map((wpm, index) => ({
      elapsedMs: result.performance.elapsedMs[index]!,
      wpm,
      rawWpm: result.performance.rawWpm[index]!,
      burst: result.performance.burst[index]!,
      errors: result.performance.errors[index]!,
    }));
  }

  // Older results only have the interval pace array. Keep those readable
  // without inventing raw, burst, or error values that were never recorded.
  return result.samples.map((wpm, index) => ({
    elapsedMs: (index + 1) * 1000,
    wpm,
    rawWpm: null,
    burst: null,
    errors: null,
  }));
}

function elapsedLabel(elapsedMs: number): string {
  const seconds = elapsedMs / 1000;
  return `${formatDecimal(seconds, Number.isInteger(seconds) ? 0 : 1)}s`;
}

function metricValue(value: number | null, digits = 0): string {
  return value === null ? "-" : formatDecimal(value, digits);
}

export function PaceChart({ result }: { result: TestResult }) {
  const gradientId = useId();
  const captionId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = pointsFor(result);

  if (points.length < 2) {
    return (
      <div
        className="flex h-28 items-center justify-center rounded-md border border-dashed border-line text-xs text-ink-faint"
        role="img"
        aria-label="Words per minute during this test: not enough data to plot"
      >
        Too short to plot
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const speedValues = points.flatMap((point) =>
    [point.wpm, point.rawWpm, point.burst].filter((value): value is number => value !== null),
  );
  const yMax = Math.max(10, Math.ceil((Math.max(...speedValues, 1) * 1.1) / 10) * 10);
  const errorMax = Math.max(...points.map((point) => point.errors ?? 0), 1);

  const xFor = (index: number) => PAD.left + (index / (points.length - 1)) * plotW;
  const yFor = (value: number) => PAD.top + (1 - value / yMax) * plotH;
  const errorYFor = (value: number) => PAD.top + (1 - value / errorMax) * plotH;
  const pathFor = (key: "wpm" | "rawWpm" | "burst") => {
    if (points.some((point) => point[key] === null)) return null;
    return `M${points
      .map((point, index) => `${xFor(index).toFixed(2)},${yFor(point[key]!).toFixed(2)}`)
      .join("L")}`;
  };

  const wpmPath = pathFor("wpm")!;
  const rawPath = pathFor("rawWpm");
  const burstPath = pathFor("burst");
  const area = `${wpmPath}L${xFor(points.length - 1)},${PAD.top + plotH}L${xFor(0)},${
    PAD.top + plotH
  }Z`;
  const active = activeIndex === null ? null : points[activeIndex]!;

  const selectFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round(((x - PAD.left) / plotW) * (points.length - 1));
    setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    let next = activeIndex ?? points.length - 1;
    if (event.key === "ArrowLeft") next--;
    else if (event.key === "ArrowRight") next++;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = points.length - 1;
    else return;
    event.preventDefault();
    setActiveIndex(Math.max(0, Math.min(points.length - 1, next)));
  };

  const activeX = activeIndex === null ? 0 : xFor(activeIndex);
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
          aria-describedby={captionId}
          aria-label={`Pace across ${points.length} sampled intervals. Use the pointer or arrow keys for point details.`}
          onFocus={() => setActiveIndex((current) => current ?? points.length - 1)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={onKeyDown}
          onPointerDown={selectFromPointer}
          onPointerMove={selectFromPointer}
          onPointerLeave={() => setActiveIndex(null)}
        >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const tick = Math.round(yMax * ratio);
          return (
            <g key={ratio}>
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
                x={PAD.left - 7}
                y={yFor(tick) + 3}
                textAnchor="end"
                className="fill-[var(--ink-faint)] font-mono text-[9px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        {burstPath ? (
          <path
            d={burstPath}
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth="1.5"
            strokeOpacity="0.65"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {rawPath ? (
          <path
            d={rawPath}
            fill="none"
            stroke="var(--chart-2)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path
          d={wpmPath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point, index) =>
          point.errors && point.errors > 0 ? (
            <g key={point.elapsedMs} transform={`translate(${xFor(index)} ${errorYFor(point.errors)})`}>
              <line x1="-3" y1="-3" x2="3" y2="3" stroke="var(--danger)" strokeWidth="1.5" />
              <line x1="3" y1="-3" x2="-3" y2="3" stroke="var(--danger)" strokeWidth="1.5" />
            </g>
          ) : null,
        )}

        {active && activeIndex !== null ? (
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
              r="4.5"
              fill="var(--chart-1)"
              stroke="var(--raised)"
              strokeWidth="2"
            />
          </g>
        ) : null}
        </svg>

        {active ? (
          <div
            aria-hidden
            className={`pointer-events-none absolute top-1/2 z-10 w-32 -translate-y-1/2 rounded-md border border-line bg-raised/98 p-2 font-mono shadow-lg ${
              activeX > W / 2 ? "-ml-2 -translate-x-full" : "ml-2"
            }`}
            style={{ left: `${(activeX / W) * 100}%` }}
          >
            <p className="mb-1.5 text-[0.6875rem] font-semibold text-ink">
              {elapsedLabel(active.elapsedMs)}
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.625rem] leading-tight">
              {[
                ["WPM", metricValue(active.wpm), "bg-chart-1"],
                ["Raw", metricValue(active.rawWpm), "bg-chart-2"],
                ["Burst", metricValue(active.burst), "bg-ink-faint"],
                ["Errors", active.errors === null ? "-" : formatInt(active.errors), "bg-danger"],
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

      <figcaption id={captionId} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {[
          ["WPM", "bg-chart-1"],
          ["Raw", "bg-chart-2"],
          ["Burst", "bg-ink-faint"],
          ["Errors", "bg-danger"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[0.6875rem] text-ink-soft">
            <span className={`size-1.5 rounded-sm ${color}`} aria-hidden />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[0.6875rem] text-ink-faint">Hover or use arrow keys</span>
        <span className="sr-only" aria-live="polite">
          {active
            ? `${elapsedLabel(active.elapsedMs)}: ${metricValue(active.wpm)} words per minute, ${metricValue(active.rawWpm)} raw, ${metricValue(active.burst)} burst, ${active.errors === null ? "errors not recorded" : `${formatInt(active.errors)} ${active.errors === 1 ? "error" : "errors"}`}`
            : "No pace point selected"}
        </span>
      </figcaption>
    </figure>
  );
}
