"use client";

import { Flame, Gauge, Target, Timer, Trophy, Type } from "lucide-react";
import type { Summary } from "@/lib/analysis";
import { formatDecimal, formatDuration, formatInt, formatSigned } from "@/lib/format";
import { Panel } from "@/components/ui/panel";
import { Stat } from "@/components/ui/bits";

export function SummaryTiles({ summary }: { summary: Summary }) {
  const tiles = [
    {
      icon: Trophy,
      label: "Best speed",
      value: formatDecimal(summary.bestWpm, 0),
      unit: "wpm",
      tone: "primary" as const,
      hint: "Your fastest recorded test",
    },
    {
      icon: Gauge,
      label: "Recent average",
      value: formatDecimal(summary.recentWpm, 0),
      unit: "wpm",
      tone: "ink" as const,
      hint:
        summary.trend === null
          ? "Across your last 10 tests"
          : `${formatSigned(summary.trend, 1)} wpm vs the 10 before`,
    },
    {
      icon: Target,
      label: "Recent accuracy",
      value: formatDecimal(summary.recentAccuracy, 1),
      unit: "%",
      tone: "ink" as const,
      hint: "Across your last 10 tests",
    },
    {
      icon: Flame,
      label: "Streak",
      value: formatInt(summary.streak),
      unit: summary.streak === 1 ? "day" : "days",
      tone: summary.streak > 0 ? ("accent" as const) : ("ink" as const),
      hint: `${summary.activeDays} days practised in total`,
    },
    {
      icon: Timer,
      label: "Time typed",
      value: formatDuration(summary.totalMs),
      tone: "ink" as const,
      hint: `${formatInt(summary.tests)} tests recorded`,
    },
    {
      icon: Type,
      label: "Words typed",
      value: formatInt(summary.totalWords),
      tone: "ink" as const,
      hint: "Counted in five-character words",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <Panel key={tile.label} className="p-4">
          <tile.icon className="mb-3 size-4 text-ink-faint" aria-hidden />
          <Stat
            label={tile.label}
            value={tile.value}
            unit={tile.unit}
            tone={tile.tone}
            hint={tile.hint}
          />
        </Panel>
      ))}
    </div>
  );
}
