"use client";

import { Flame, Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { summarise } from "@/lib/analysis";
import { comparableResults, benchmarkLabel } from "@/lib/practice";
import { formatDecimal, formatSigned } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Skeleton, Stat } from "@/components/ui/bits";

/**
 * The at-a-glance state of play, shown next to the page title so the first
 * screen answers "where am I at?" without a click.
 */
export function QuickStats() {
  const { results, ready } = useStore();

  if (!ready) {
    return (
      <div className="flex gap-8">
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-12 w-20" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <p className="max-w-xs rounded-lg border border-dashed border-line bg-muted/40 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        No tests yet. Finish one run and your speed, accuracy and weak keys
        start tracking here.
      </p>
    );
  }

  const latest = results.find((r) => r.training);
  const summary = summarise(latest ? comparableResults(latest, results) : []);
  const habit = summarise(results);
  const Trend =
    summary.trend !== null && summary.trend < 0 ? TrendingDown : TrendingUp;

  return (
    <div>
      <p className="mb-3 max-w-sm text-xs text-ink-faint">
        {latest
          ? `Speed: ${benchmarkLabel(latest)}`
          : "New tests will track comparable speed."}
      </p>
      <dl className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Stat
          label="Best"
          value={formatDecimal(summary.bestWpm, 0)}
          unit="wpm"
          tone="primary"
        />
        <Stat
          label="Last 10"
          value={formatDecimal(summary.recentWpm, 0)}
          unit="wpm"
          hint={
            summary.trend !== null ? (
              <span
                className={
                  summary.trend >= 0
                    ? "flex items-center gap-1 text-success"
                    : "flex items-center gap-1 text-danger"
                }
              >
                <Trend className="size-3" aria-hidden />
                {formatSigned(summary.trend, 1)} wpm
              </span>
            ) : (
              "Matching tests only"
            )
          }
        />
        <Stat
          label="Streak"
          value={habit.streak}
          unit={habit.streak === 1 ? "day" : "days"}
          tone={habit.streak > 0 ? "accent" : "ink"}
          hint={
            habit.streak > 0 ? (
              <span className="flex items-center gap-1">
                <Flame className="size-3 text-accent" aria-hidden />
                Keep it going
              </span>
            ) : (
              "Practise today to start one"
            )
          }
        />
        <Stat
          label="Tests"
          value={habit.tests}
          hint={
            <span className="flex items-center gap-1">
              <Trophy className="size-3 text-ink-faint" aria-hidden />
              {habit.activeDays} active{" "}
              {habit.activeDays === 1 ? "day" : "days"}
            </span>
          }
        />
      </dl>
    </div>
  );
}
