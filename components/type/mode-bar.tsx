"use client";

import { Braces, Dumbbell, Hash, Quote, RotateCcw, Timer, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateSettings, useStore } from "@/lib/store";
import { DURATIONS, WORD_COUNTS, type Drill, type TestMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Select } from "@/components/ui/controls";
import { Tooltip } from "@/components/ui/tooltip";
import type { TestConfig } from "./use-typing-test";

const MODE_ICONS: Record<TestMode, typeof Timer> = {
  time: Timer,
  words: Type,
  quote: Quote,
  code: Braces,
  drill: Dumbbell,
};

/** Small keycap toggle for the text-content switches. */
function TextToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[0.8125rem] font-medium",
        "transition-[background-color,color,border-color,box-shadow] duration-150",
        active
          ? "border-primary/30 bg-primary-soft text-primary"
          : "border-line bg-transparent text-ink-soft hover:bg-muted hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function ModeBar({
  config,
  onConfig,
  onRestart,
  drills,
}: {
  config: TestConfig;
  onConfig: (config: TestConfig) => void;
  onRestart: () => void;
  drills: Drill[];
}) {
  const { settings } = useStore();

  const { punctuation, numbers } = settings;

  const selectMode = (mode: TestMode) => {
    switch (mode) {
      case "time":
        return onConfig({ mode: "time", seconds: settings.duration, punctuation, numbers });
      case "words":
        return onConfig({ mode: "words", count: settings.wordCount, punctuation, numbers });
      case "quote":
        return onConfig({ mode: "quote" });
      case "code":
        return onConfig({ mode: "code" });
      case "drill": {
        const first = drills[0];
        if (!first) return;
        return onConfig({
          mode: "drill",
          id: first.id,
          name: first.name,
          text: first.text,
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented
          label="Test mode"
          value={config.mode}
          onValueChange={selectMode}
          options={(["time", "words", "quote", "code", "drill"] as TestMode[]).map(
            (mode) => {
              const Icon = MODE_ICONS[mode];
              const label = { time: "Timed", words: "Words", quote: "Prose", code: "Code", drill: "Drill" }[
                mode
              ];
              return {
                value: mode,
                title: label,
                label: (
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                ),
              };
            },
          )}
        />

        <div className="ml-auto flex items-center gap-2">
          <Tooltip content="New text (Tab)">
            <Button variant="ghost" size="iconSm" onClick={onRestart} aria-label="New text">
              <RotateCcw className="size-4" aria-hidden />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {config.mode === "time" ? (
          <Segmented
            size="sm"
            label="Test length in seconds"
            value={String(config.seconds)}
            onValueChange={(value) => {
              const seconds = Number(value) as (typeof DURATIONS)[number];
              updateSettings({ duration: seconds });
              onConfig({ mode: "time", seconds, punctuation, numbers });
            }}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d}s` }))}
          />
        ) : null}

        {config.mode === "words" ? (
          <Segmented
            size="sm"
            label="Number of words"
            value={String(config.count)}
            onValueChange={(value) => {
              const count = Number(value) as (typeof WORD_COUNTS)[number];
              updateSettings({ wordCount: count });
              onConfig({ mode: "words", count, punctuation, numbers });
            }}
            options={WORD_COUNTS.map((c) => ({ value: String(c), label: String(c) }))}
          />
        ) : null}

        {config.mode === "drill" ? (
          drills.length > 0 ? (
            <Select
              ariaLabel="Choose a drill"
              className="h-8 max-w-[16rem] text-[0.8125rem]"
              value={drills.some((d) => d.id === config.id) ? config.id : drills[0].id}
              onValueChange={(id) => {
                const drill = drills.find((d) => d.id === id);
                if (drill) {
                  onConfig({
                    mode: "drill",
                    id: drill.id,
                    name: drill.name,
                    text: drill.text,
                  });
                }
              }}
              options={drills.map((d) => ({ value: d.id, label: d.name }))}
            />
          ) : null
        ) : null}

        {config.mode === "time" || config.mode === "words" ? (
          <div className="flex items-center gap-2">
            <TextToggle
              label="Punctuation"
              active={config.punctuation}
              onClick={() => {
                const next = !config.punctuation;
                updateSettings({ punctuation: next });
                onConfig({ ...config, punctuation: next });
              }}
              icon={<span className="font-mono text-xs leading-none">,.!</span>}
            />
            <TextToggle
              label="Numbers"
              active={config.numbers}
              onClick={() => {
                const next = !config.numbers;
                updateSettings({ numbers: next });
                onConfig({ ...config, numbers: next });
              }}
              icon={<Hash className="size-3.5" aria-hidden />}
            />
          </div>
        ) : null}

        {config.mode === "quote" || config.mode === "code" ? (
          <p className="text-xs text-ink-soft">
            {config.mode === "quote"
              ? "Real sentences, capitals and punctuation included."
              : "Brackets, operators and symbols from working code."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
