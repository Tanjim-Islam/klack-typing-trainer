"use client";

import { Gauge, Target, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock, formatDecimal } from "@/lib/format";
import { Kbd } from "@/components/ui/bits";
import type { Phase, TestConfig } from "./use-typing-test";

function Readout({
  icon,
  label,
  value,
  unit,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-ink-faint", muted && "opacity-60")} aria-hidden>
        {icon}
      </span>
      <span className="flex flex-col leading-none">
        <span className="legend mb-1">{label}</span>
        <span className="flex items-baseline gap-1">
          <span
            className={cn(
              "font-display text-lg font-semibold leading-none tnum tracking-tight",
              muted ? "text-ink-faint" : "text-ink",
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className="font-mono text-[0.625rem] text-ink-faint">{unit}</span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

export function LiveHud({
  phase,
  config,
  remaining,
  progress,
  wpm,
  accuracy,
  typedWords,
  totalWords,
  showStats,
}: {
  phase: Phase;
  config: TestConfig;
  remaining: number | null;
  progress: number;
  wpm: number;
  accuracy: number;
  typedWords: number;
  totalWords: number;
  showStats: boolean;
}) {
  const idle = phase === "idle";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        {config.mode === "time" ? (
          <Readout
            icon={<Timer className="size-4" />}
            label={idle ? "Time" : "Time left"}
            value={formatClock(remaining ?? config.seconds)}
            muted={idle}
          />
        ) : (
          <Readout
            icon={<Target className="size-4" />}
            label="Progress"
            value={`${typedWords}/${totalWords}`}
            unit="words"
            muted={idle}
          />
        )}

        {idle ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span
              aria-hidden
              className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Start typing to begin
            <span className="hidden items-center gap-1 sm:flex">
              <span className="text-ink-faint">or press</span>
              <Kbd>Tab</Kbd>
              <span className="text-ink-faint">for new text</span>
            </span>
          </p>
        ) : showStats ? (
          <div className="flex items-end gap-6">
            <Readout
              icon={<Gauge className="size-4" />}
              label="Speed"
              value={formatDecimal(wpm, 0)}
              unit="wpm"
            />
            <Readout
              icon={<Target className="size-4" />}
              label="Accuracy"
              value={formatDecimal(accuracy, 0)}
              unit="%"
            />
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            Live stats hidden. Keep your eyes on the words.
          </p>
        )}
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Test progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
