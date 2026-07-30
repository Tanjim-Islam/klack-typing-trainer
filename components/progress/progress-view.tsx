"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Keyboard, LineChart } from "lucide-react";
import { recentActivity, summarise } from "@/lib/analysis";
import { clearResults, deleteResult, useStore } from "@/lib/store";
import { ActivityStrip } from "@/components/progress/activity-strip";
import { HistoryTable } from "@/components/progress/history-table";
import { SummaryTiles } from "@/components/progress/summary-tiles";
import { WeakKeysPanel } from "@/components/progress/weak-keys-panel";
import { WpmChart } from "@/components/charts/wpm-chart";
import { EmptyState, Skeleton } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

type Range = "20" | "50" | "all";

export function ProgressView() {
  const { ready, results } = useStore();
  const [range, setRange] = useState<Range>("20");

  const summary = useMemo(() => summarise(results), [results]);
  const activity = useMemo(() => recentActivity(results, 28), [results]);

  const charted = useMemo(() => {
    const newestFirst = [...results].sort((a, b) => b.at - a.at);
    if (range === "all") return newestFirst;
    return newestFirst.slice(0, Number(range));
  }, [results, range]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
        <span className="sr-only">Loading your saved history</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<LineChart className="size-5" aria-hidden />}
          title="Nothing to chart yet"
          body="Finish your first typing test and this page fills up: speed over time, a keyboard accuracy map, and the keys worth drilling."
          action={
            <Button variant="primary" asChild>
              <Link href="/">
                Take a test
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <SummaryTiles summary={summary} />

      <Panel>
        <PanelHeader
          icon={<LineChart className="size-4" aria-hidden />}
          title="Speed over time"
          description="Each point is one recorded test, oldest on the left."
          actions={
            <Segmented
              size="sm"
              label="How many tests to chart"
              value={range}
              onValueChange={setRange}
              options={[
                { value: "20", label: "Last 20" },
                { value: "50", label: "Last 50" },
                { value: "all", label: "All" },
              ]}
            />
          }
        />
        <PanelBody>
          {charted.length < 2 ? (
            <EmptyState
              icon={<LineChart className="size-5" aria-hidden />}
              title="One test is not a trend"
              body="Take at least two tests and the line chart appears here."
              className="py-10"
            />
          ) : (
            <WpmChart results={charted} />
          )}
        </PanelBody>
      </Panel>

      <WeakKeysPanel results={results} />

      <Panel>
        <PanelHeader
          icon={<CalendarDays className="size-4" aria-hidden />}
          title="Practice habit"
          description="Short daily sessions beat occasional long ones."
        />
        <PanelBody>
          <ActivityStrip days={activity} />
        </PanelBody>
      </Panel>

      <HistoryTable
        results={results}
        onDelete={deleteResult}
        onClearAll={clearResults}
      />

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-faint">
        <Keyboard className="mt-px size-3.5 shrink-0" aria-hidden />
        Klack keeps your most recent 500 tests in this browser. Older tests are
        dropped to keep things fast.
      </p>
    </div>
  );
}
