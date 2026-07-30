"use client";

import Link from "next/link";
import {
  ArrowRight,
  Info,
  RotateCcw,
  SkipForward,
  Trophy,
} from "lucide-react";
import { worstKeysInResult } from "@/lib/analysis";
import { formatDecimal, formatDuration, formatInt } from "@/lib/format";
import { charName } from "@/lib/keyboard";
import type { TestResult } from "@/lib/types";
import { MODE_LABELS } from "@/lib/types";
import { Sparkline } from "@/components/charts/sparkline";
import { Badge, Kbd, Stat } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export function ResultsPanel({
  result,
  recorded,
  isPersonalBest,
  onNext,
  onRepeat,
}: {
  result: TestResult;
  recorded: boolean;
  isPersonalBest: boolean;
  onNext: () => void;
  onRepeat: () => void;
}) {
  const worst = worstKeysInResult(result);
  const hasConsistency = result.samples.length >= 3;

  return (
    <Panel className="animate-rise overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5 sm:px-6">
        <Badge tone="primary">{MODE_LABELS[result.mode]}</Badge>
        <span className="text-sm font-medium text-ink">{result.label}</span>
        <span className="text-sm text-ink-faint">
          {formatDuration(result.elapsedMs)}
        </span>
        {isPersonalBest ? (
          <Badge tone="accent" className="ml-auto">
            <Trophy className="size-3" aria-hidden />
            Personal best
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
            <Stat
              label="Words per minute"
              value={formatDecimal(result.wpm, 0)}
              size="lg"
              tone="primary"
              hint={`${formatDecimal(result.rawWpm, 0)} raw, before mistakes`}
            />
            <Stat
              label="Accuracy"
              value={formatDecimal(result.accuracy, 1)}
              unit="%"
              size="md"
              hint={`${formatInt(result.correctKeystrokes)} of ${formatInt(
                result.keystrokes,
              )} keys`}
            />
            <Stat
              label="Consistency"
              value={hasConsistency ? formatDecimal(result.consistency, 0) : "-"}
              unit={hasConsistency ? "%" : undefined}
              size="md"
              hint="How even your pace was"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-line pt-5">
            <Stat
              label="Correct"
              value={formatInt(result.correctChars)}
              unit="chars"
              size="sm"
              tone="success"
            />
            <Stat
              label="Missed"
              value={formatInt(result.incorrectChars)}
              unit="chars"
              size="sm"
              tone={result.incorrectChars > 0 ? "danger" : "ink"}
            />
            <Stat
              label="Words"
              value={formatInt(result.words)}
              size="sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h3 className="legend mb-2.5">Pace, second by second</h3>
            <Sparkline
              values={result.samples}
              label="Words per minute during this test"
              className="w-full rounded-md"
            />
          </div>

          <div>
            <h3 className="legend mb-2.5">Keys you fumbled here</h3>
            {worst.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Nothing missed. That is a clean run.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {worst.map((key) => (
                  <li
                    key={key.id}
                    className="flex items-center gap-2 rounded-md border border-line bg-muted/40 py-1 pl-1 pr-2.5"
                  >
                    <Kbd>{charName(key.char)}</Kbd>
                    <span className="font-mono text-[0.6875rem] text-ink-soft tnum">
                      {formatInt(key.misses)} missed
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!recorded ? (
        <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-lg border border-info/25 bg-info-soft px-3.5 py-3 sm:mx-6 sm:mb-6">
          <Info className="mt-px size-4 shrink-0 text-info" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-soft">
            This run was not saved to your history. Klack keeps tests of at least
            three seconds and ten keystrokes, so short warm-ups do not skew your
            averages.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-muted/40 px-5 py-4 sm:px-6">
        <Button variant="primary" onClick={onNext}>
          <SkipForward className="size-4" aria-hidden />
          Next test
          {/* Left as a real keycap. Tinting it to sit on the primary button
              cannot work: `.keycap` is declared after Tailwind's utilities in
              the same layer, so its background-color wins over any `bg-*`
              class, and the legend was left the same near-black as the button
              text in dark mode. `text-ink-soft` tracks the theme, so it reads
              in both. */}
          <Kbd className="ml-1">Tab</Kbd>
        </Button>
        <Button variant="keycap" onClick={onRepeat}>
          <RotateCcw className="size-4" aria-hidden />
          Same text again
        </Button>
        <Button variant="ghost" asChild className="ml-auto">
          <Link href="/progress">
            See progress
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
