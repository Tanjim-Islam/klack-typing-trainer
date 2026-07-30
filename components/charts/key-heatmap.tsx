"use client";

import { cn } from "@/lib/cn";
import { keyScores, MIN_ATTEMPTS_FOR_WEAKNESS, type KeyScore } from "@/lib/analysis";
import type { KeyTally } from "@/lib/engine";
import { charName, KEYBOARD_ROWS, type KeyDef } from "@/lib/keyboard";
import { formatDecimal, formatInt } from "@/lib/format";

/** Accuracy below this reads as fully "hot" on the scale. */
const FLOOR = 78;

function heatFor(score: KeyScore | undefined): number {
  if (!score || score.attempts < MIN_ATTEMPTS_FOR_WEAKNESS) return -1;
  const t = (100 - score.accuracy) / (100 - FLOOR);
  return Math.max(0, Math.min(1, t));
}

function KeyCap({
  keyDef,
  score,
  flagged,
}: {
  keyDef: KeyDef;
  score: KeyScore | undefined;
  flagged: boolean;
}) {
  if (keyDef.ghost) {
    return (
      <div
        aria-hidden
        style={{ gridColumn: `span ${keyDef.span}` }}
        className="flex h-9 items-end justify-start rounded-md border border-line-soft bg-muted/30 px-1.5 pb-1 font-mono text-[0.5625rem] lowercase text-ink-faint/60 sm:h-11"
      >
        <span className="truncate">{keyDef.label}</span>
      </div>
    );
  }

  const heat = heatFor(score);
  const untested = heat < 0;

  const title = untested
    ? `${charName(keyDef.label)}: not enough data yet${
        score && score.attempts > 0 ? ` (${score.attempts} attempts)` : ""
      }`
    : `${charName(keyDef.label)}: ${formatDecimal(score!.accuracy)}% accurate over ${formatInt(
        score!.attempts,
      )} attempts, ${formatInt(score!.misses)} missed`;

  return (
    <div
      title={title}
      style={{
        gridColumn: `span ${keyDef.span}`,
        // color-mix keeps the scale on the theme's own danger colour, so it
        // works in both light and dark without a second palette.
        backgroundColor: untested
          ? undefined
          : `color-mix(in oklab, var(--danger) ${Math.round(heat * 58)}%, var(--keycap))`,
      }}
      className={cn(
        "relative flex h-9 flex-col justify-between overflow-hidden rounded-md border px-1.5 py-1 sm:h-11",
        untested
          ? "border-dashed border-line bg-muted/25 text-ink-faint"
          : "border-line text-ink shadow-key",
        flagged && "ring-2 ring-danger ring-offset-1 ring-offset-surface",
      )}
    >
      <span className="flex items-start justify-between gap-1 leading-none">
        <span className="font-mono text-[0.6875rem] font-semibold sm:text-xs">
          {keyDef.label === " " ? "" : keyDef.label}
        </span>
        {keyDef.shiftLabel ? (
          <span className="font-mono text-[0.5625rem] opacity-55">{keyDef.shiftLabel}</span>
        ) : null}
      </span>

      {/* The number is the non-colour channel: the heat map is never the only
          way to read a weak key. */}
      <span className="font-mono text-[0.5rem] leading-none tnum sm:text-[0.5625rem]">
        {untested ? "-" : `${Math.round(score!.accuracy)}%`}
      </span>
    </div>
  );
}

export function KeyHeatmap({
  stats,
  flaggedKeys = [],
  className,
}: {
  stats: Record<string, KeyTally>;
  /** Key ids to outline, normally the current weakest set. */
  flaggedKeys?: string[];
  className?: string;
}) {
  const scores = keyScores(stats);
  const flagged = new Set(flaggedKeys);

  return (
    <div className={className}>
      {/* A keyboard has a minimum legible width; below that it scrolls inside
          this box rather than squeezing the legends into nothing. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          role="img"
          aria-label="Keyboard accuracy heat map. The weakest keys are listed in full beside this diagram."
          className="flex min-w-[34rem] flex-col gap-1.5"
        >
          {KEYBOARD_ROWS.map((row, index) => (
            <div
              key={index}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(60, minmax(0, 1fr))" }}
            >
              {row.map((keyDef, keyIndex) => (
                <KeyCap
                  key={`${keyDef.id}-${keyIndex}`}
                  keyDef={keyDef}
                  score={scores.get(keyDef.id)}
                  flagged={flagged.has(keyDef.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2">
          <span className="legend">Accurate</span>
          <span
            aria-hidden
            className="h-2.5 w-24 rounded-full border border-line"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--keycap), color-mix(in oklab, var(--danger) 58%, var(--keycap)))",
            }}
          />
          <span className="legend">Missed often</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-[3px] border border-dashed border-line bg-muted/25"
          />
          <span className="legend">Not enough data</span>
        </span>
      </div>
    </div>
  );
}
