"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { queueDrill, useStore } from "@/lib/store";
import type { Drill, Settings } from "@/lib/types";
import { Badge, Skeleton } from "@/components/ui/bits";
import { Panel } from "@/components/ui/panel";
import { LiveHud } from "./live-hud";
import { ModeBar } from "./mode-bar";
import { OnboardingCard } from "./onboarding-card";
import { ResultsPanel } from "./results-panel";
import { TypingSurface } from "./typing-surface";
import { useFocusStage } from "./use-focus-stage";
import { useTypingTest, type TestConfig } from "./use-typing-test";
import { dismissOnboarding } from "@/lib/store";

/** Waits for storage so the first test respects the saved defaults. */
export function TypingTest() {
  const { ready, settings, drills, queuedDrill } = useStore();

  if (!ready) return <TypingSkeleton />;

  const initialConfig: TestConfig = queuedDrill
    ? {
        mode: "drill",
        id: "generated",
        name: queuedDrill.name,
        text: queuedDrill.text,
        keys: queuedDrill.keys,
      }
    : defaultConfig(settings, drills);

  return <TestBody initialConfig={initialConfig} />;
}

function defaultConfig(settings: Settings, drills: Drill[]): TestConfig {
  const { punctuation, numbers } = settings;
  const timed: TestConfig = {
    mode: "time",
    seconds: settings.duration,
    punctuation,
    numbers,
  };
  const first = drills[0];

  switch (settings.defaultMode) {
    case "words":
      return { mode: "words", count: settings.wordCount, punctuation, numbers };
    case "quote":
      return { mode: "quote" };
    case "code":
      return { mode: "code" };
    case "drill":
      return first
        ? { mode: "drill", id: first.id, name: first.name, text: first.text }
        : timed;
    case "time":
    default:
      return timed;
  }
}

function TestBody({ initialConfig }: { initialConfig: TestConfig }) {
  const { settings, drills, onboarded, results } = useStore();
  const {
    phase,
    engine,
    text,
    meta,
    config,
    remaining,
    progress,
    liveWpm,
    liveAccuracy,
    result,
    recorded,
    isPersonalBest,
    attachInput,
    focusInput,
    setConfig,
    restart,
    repeat,
    resume,
  } = useTypingTest(initialConfig);

  const [focused, setFocused] = useState(false);

  const showOnboarding = !onboarded && results.length === 0;

  // The drill hand-off is consumed once: a later visit starts from the defaults.
  useEffect(() => {
    queueDrill(null);
  }, []);

  // Put the cursor in the typing field straight away. On this page typing is the
  // only thing to do.
  useEffect(() => {
    if (showOnboarding) return;
    focusInput();
  }, [showOnboarding, focusInput]);

  // Shortcuts keep working on the results screen, where the input is unmounted.
  useEffect(() => {
    if (phase !== "finished") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        restart();
      } else if (event.key === "Escape") {
        event.preventDefault();
        repeat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, restart, repeat]);

  const totalWords = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text],
  );

  const typedWords = useMemo(() => {
    if (engine.cursor === 0) return 0;
    if (engine.cursor >= text.length) return totalWords;
    return Math.min(totalWords, text.slice(0, engine.cursor).split(" ").length - 1);
  }, [engine.cursor, text, totalWords]);

  const veil: "none" | "focus" | "pause" =
    phase === "paused" ? "pause" : focused ? "none" : "focus";

  const adaptiveKeys = config.mode === "drill" ? config.keys : undefined;
  const finished = phase === "finished" && result !== null;
  const focusStage = phase === "running" || phase === "paused";

  useFocusStage(focusStage);

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        focusStage &&
          "fixed inset-x-0 bottom-0 top-15 z-30 overflow-y-auto bg-canvas px-4 sm:px-6",
      )}
    >
      {showOnboarding && !focusStage ? (
        <OnboardingCard onDismiss={dismissOnboarding} />
      ) : null}

      <div
        className={cn(
          focusStage && "mx-auto flex min-h-full w-full max-w-5xl items-center py-8 sm:py-12",
        )}
      >
        <Panel
          className={cn(
            "overflow-hidden",
            focusStage && "w-full border-0 bg-transparent shadow-none",
          )}
        >
          {!focusStage ? (
            <div className="border-b border-line px-4 py-4 sm:px-6">
              <ModeBar
                config={config}
                onConfig={setConfig}
                onRestart={restart}
                drills={drills}
              />
            </div>
          ) : null}

          {finished ? null : (
            <div
              className={cn(
                "flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6",
                focusStage && "gap-8 px-0 py-0 sm:px-0 sm:py-0",
              )}
            >
              <LiveHud
                phase={phase}
                config={config}
                remaining={remaining}
                progress={progress}
                wpm={liveWpm}
                accuracy={liveAccuracy}
                typedWords={typedWords}
                totalWords={totalWords}
                showStats={settings.showLiveStats}
              />

              <div className="relative">
                {/* Visually hidden, but this is the real input: it owns focus and
                    receives every keystroke. */}
                <textarea
                  ref={attachInput}
                  value=""
                  onChange={() => undefined}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label="Typing test input"
                  aria-describedby="typing-target"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="absolute inset-0 -z-10 size-full resize-none opacity-0"
                />
                <p id="typing-target" className="sr-only">
                  Type the following text. Press Tab for new text, or Escape to start
                  this text again. Text to type: {text}
                </p>

                <TypingSurface
                  text={text}
                  states={engine.states}
                  cursor={engine.cursor}
                  caret={settings.caret}
                  textSize={settings.textSize}
                  veil={veil}
                  blinking={phase !== "running"}
                  onActivate={resume}
                />
              </div>

              {!focusStage ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
                  {adaptiveKeys?.length ? (
                    <Badge tone="accent">
                      <Sparkles className="size-3" aria-hidden />
                      Targeting{" "}
                      {adaptiveKeys.map((k) => (k === " " ? "space" : k)).join(" ")}
                    </Badge>
                  ) : meta ? (
                    <Badge tone="neutral">{meta}</Badge>
                  ) : null}

                  <p className="text-xs text-ink-faint">
                    {settings.stopOnError
                      ? "Stop on error is on: mistakes must be fixed before you can move on."
                      : "Press space mid-word to skip it. Skipped letters count as misses."}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>

      {finished && result ? (
        <ResultsPanel
          result={result}
          recorded={recorded}
          isPersonalBest={isPersonalBest}
          onNext={restart}
          onRepeat={repeat}
        />
      ) : null}
    </div>
  );
}

function TypingSkeleton() {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-4 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="ml-auto h-8 w-8" />
      </div>
      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex justify-between">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-1 w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-11/12" />
          <Skeleton className="h-7 w-3/4" />
        </div>
      </div>
      <span className="sr-only">Loading your saved settings</span>
    </Panel>
  );
}
