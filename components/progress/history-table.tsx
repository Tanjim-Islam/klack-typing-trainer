"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, History, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDecimal, formatDuration, formatRelative } from "@/lib/format";
import { MODE_LABELS, TEST_MODES, type TestMode, type TestResult } from "@/lib/types";
import { Badge, EmptyState, Kbd } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/controls";
import { Input } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tooltip } from "@/components/ui/tooltip";

type SortKey = "at" | "wpm" | "accuracy";
type SortDir = "asc" | "desc";
type ModeFilter = TestMode | "all";

const PAGE_SIZE = 12;

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "at", label: "When", align: "left" },
  { key: "wpm", label: "Speed", align: "right" },
  { key: "accuracy", label: "Accuracy", align: "right" },
];

export function HistoryTable({
  results,
  onDelete,
  onClearAll,
}: {
  results: TestResult[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<TestResult | null>(null);
  const [clearing, setClearing] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = results.filter((r) => {
      if (mode !== "all" && r.mode !== mode) return false;
      if (!needle) return true;
      return (
        r.label.toLowerCase().includes(needle) ||
        MODE_LABELS[r.mode].toLowerCase().includes(needle)
      );
    });

    return rows.sort((a, b) => {
      const delta = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? delta : -delta;
    });
  }, [results, query, mode, sortKey, sortDir]);

  const page = filtered.slice(0, visible);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "at" ? "desc" : "desc");
    }
    setVisible(PAGE_SIZE);
  };

  const ariaSort = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <Panel>
      <PanelHeader
        icon={<History className="size-4" aria-hidden />}
        title="Test history"
        description={`${results.length} test${results.length === 1 ? "" : "s"} saved in this browser.`}
        actions={
          <Button variant="dangerGhost" size="sm" onClick={() => setClearing(true)}>
            <Trash2 className="size-4" aria-hidden />
            Clear all
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 sm:px-6">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search tests"
            aria-label="Search test history"
            className="pl-9"
          />
        </div>

        <Select
          ariaLabel="Filter by mode"
          value={mode}
          onValueChange={(value) => {
            setMode(value);
            setVisible(PAGE_SIZE);
          }}
          options={[
            { value: "all" as ModeFilter, label: "All modes" },
            ...TEST_MODES.map((m) => ({ value: m as ModeFilter, label: MODE_LABELS[m] })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-5" aria-hidden />}
          title="No tests match"
          body={
            query.trim() || mode !== "all"
              ? "Try a different search term, or clear the mode filter."
              : "Finish a test and it will show up here."
          }
          action={
            query.trim() || mode !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setMode("all");
                }}
              >
                Reset filters
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {/* Table on wide screens. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={ariaSort(column.key)}
                      className={cn(
                        "px-3 py-2.5 first:pl-5 sm:first:pl-6",
                        column.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "legend inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-ink",
                          sortKey === column.key && "text-ink",
                        )}
                      >
                        {column.label}
                        {sortKey === column.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2.5 text-left">
                    <span className="legend">Test</span>
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    <span className="legend">Steady</span>
                  </th>
                  <th scope="col" className="px-3 py-2.5 pr-5 text-right sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-line-soft last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-3 pl-5 sm:pl-6">
                      <span className="block text-ink">{formatRelative(result.at)}</span>
                      <span className="block font-mono text-[0.625rem] text-ink-faint">
                        {formatDateTime(result.at)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-ink tnum">
                      {formatDecimal(result.wpm, 1)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ink-soft tnum">
                      {formatDecimal(result.accuracy, 1)}%
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{MODE_LABELS[result.mode]}</Badge>
                        <span className="text-ink-soft">{result.label}</span>
                        <span className="font-mono text-[0.625rem] text-ink-faint">
                          {formatDuration(result.elapsedMs)}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ink-soft tnum">
                      {result.samples.length >= 3
                        ? `${formatDecimal(result.consistency, 0)}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-3 pr-5 text-right sm:pr-6">
                      <Tooltip content="Delete this test">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={() => setPendingDelete(result)}
                          aria-label={`Delete the test from ${formatDateTime(result.at)}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards on phones: the same data, no sideways scrolling. */}
          <ul className="divide-y divide-line-soft sm:hidden">
            {page.map((result) => (
              <li key={result.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{MODE_LABELS[result.mode]}</Badge>
                    <span className="text-sm text-ink-soft">{result.label}</span>
                  </div>
                  <p className="mt-1.5 font-mono text-[0.6875rem] text-ink-faint">
                    {formatRelative(result.at)} - {formatDuration(result.elapsedMs)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block font-mono text-base font-semibold text-ink tnum">
                    {formatDecimal(result.wpm, 0)}
                    <span className="ml-1 text-[0.625rem] font-normal text-ink-faint">
                      wpm
                    </span>
                  </span>
                  <span className="block font-mono text-[0.6875rem] text-ink-soft tnum">
                    {formatDecimal(result.accuracy, 1)}% accurate
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setPendingDelete(result)}
                  aria-label={`Delete the test from ${formatDateTime(result.at)}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>

          {filtered.length > page.length ? (
            <PanelBody className="flex items-center justify-center border-t border-line">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, filtered.length - page.length)} more
                <span className="text-ink-faint">
                  ({page.length} of {filtered.length})
                </span>
              </Button>
            </PanelBody>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this test?"
        body={
          pendingDelete ? (
            <>
              The {MODE_LABELS[pendingDelete.mode].toLowerCase()} test from{" "}
              {formatDateTime(pendingDelete.at)} at{" "}
              {formatDecimal(pendingDelete.wpm, 1)} wpm will be removed, along with
              its key accuracy data. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete test"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title="Clear your whole history?"
        body={
          <>
            All {results.length} saved tests will be deleted, including your key
            accuracy data and personal bests. Your drills and settings are kept.
            Export a backup from <Kbd>Settings</Kbd> first if you want to keep it.
          </>
        }
        confirmLabel="Delete everything"
        onConfirm={() => {
          onClearAll();
          setClearing(false);
        }}
      />
    </Panel>
  );
}
