"use client";

import { cn } from "@/lib/cn";
import type { DayActivity } from "@/lib/analysis";
import { formatDay } from "@/lib/format";

export function ActivityStrip({ days }: { days: DayActivity[] }) {
  const busiest = Math.max(1, ...days.map((d) => d.tests));
  const practised = days.filter((d) => d.tests > 0).length;

  return (
    <div>
      <div
        role="img"
        aria-label={`Practice activity for the last ${days.length} days. ${practised} of them had at least one test.`}
        className="grid grid-cols-14 gap-1.5 sm:grid-cols-28 sm:gap-2"
      >
        {days.map((day) => {
          const intensity = day.tests === 0 ? 0 : 0.35 + (day.tests / busiest) * 0.65;
          return (
            <div
              key={day.key}
              title={
                day.tests === 0
                  ? `${formatDay(day.date.getTime())}: no tests`
                  : `${formatDay(day.date.getTime())}: ${day.tests} test${
                      day.tests === 1 ? "" : "s"
                    }, best ${Math.round(day.bestWpm)} wpm`
              }
              className={cn(
                "aspect-square rounded-[3px] border",
                day.tests === 0 ? "border-line-soft bg-muted/40" : "border-primary/30",
              )}
              style={
                day.tests === 0
                  ? undefined
                  : {
                      backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(
                        intensity * 100,
                      )}%, var(--muted))`,
                    }
              }
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-xs text-ink-soft">
          Last {days.length} days, oldest on the left. {practised} with practice.
        </p>
        <span className="flex items-center gap-2">
          <span className="legend">Quiet</span>
          <span
            aria-hidden
            className="h-2.5 w-20 rounded-full border border-line"
            style={{
              backgroundImage: "linear-gradient(to right, var(--muted), var(--primary))",
            }}
          />
          <span className="legend">Busy</span>
        </span>
      </div>
    </div>
  );
}
