"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateTimedPassage,
  generateWordPassage,
  randomCode,
  randomProse,
} from "@/lib/content";
import {
  applyBackspace,
  applyChar,
  buildPerformanceHistory,
  buildResult,
  countChars,
  createPerformanceSnapshot,
  createEngine,
  isRecordable,
  MAX_WPM,
  type EngineState,
  type PerformanceSnapshot,
} from "@/lib/engine";
import { createId } from "@/lib/format";
import { playClick } from "@/lib/sound";
import { addResult, useStore } from "@/lib/store";
import {
  comparableResults,
  trainingFor,
  type TestConfig,
} from "@/lib/practice";
import type { TestResult } from "@/lib/types";

/**
 * A config fully determines the text of a test. Punctuation and numbers live
 * here rather than being read from settings at generation time, so toggling them
 * is an explicit "load a new test" action instead of a hidden side effect.
 */
export type { TestConfig } from "@/lib/practice";

export type Phase = "idle" | "running" | "paused" | "finished";

interface LoadedTest {
  text: string;
  label: string;
  /** Attribution or language tag shown under the text. */
  meta?: string;
}

function loadTest(config: TestConfig): LoadedTest {
  switch (config.mode) {
    case "time": {
      const passage = generateTimedPassage({
        punctuation: config.punctuation,
        numbers: config.numbers,
      });
      return {
        text: passage.text,
        label: `${config.seconds}s`,
        meta: passage.source,
      };
    }
    case "words": {
      const passage = generateWordPassage({
        count: config.count,
        punctuation: config.punctuation,
        numbers: config.numbers,
      });
      const actualWords = passage.text.trim().split(/\s+/).length;
      return {
        text: passage.text,
        label: `${actualWords} words`,
        meta: passage.source,
      };
    }
    case "quote": {
      const passage = randomProse();
      return { text: passage.text, label: "Prose", meta: passage.source };
    }
    case "code": {
      const snippet = randomCode();
      return { text: snippet.text, label: "Code", meta: snippet.language };
    }
    case "drill":
      return { text: config.text, label: config.name, meta: "Drill" };
  }
}

/** One loaded test plus the keystrokes recorded against it. */
interface Session {
  test: LoadedTest;
  engine: EngineState;
}

function startSession(config: TestConfig, reuse?: LoadedTest): Session {
  const test = reuse ?? loadTest(config);
  return { test, engine: createEngine(test.text) };
}

export interface TypingTest {
  phase: Phase;
  engine: EngineState;
  text: string;
  label: string;
  meta?: string;
  config: TestConfig;
  elapsedMs: number;
  /** Seconds left in a timed test, otherwise null. */
  remaining: number | null;
  /** 0 to 1 completion of the current test. */
  progress: number;
  liveWpm: number;
  liveAccuracy: number;
  result: TestResult | null;
  recorded: boolean;
  isPersonalBest: boolean;
  /** Ref callback for the hidden textarea that owns focus and keystrokes. */
  attachInput: (element: HTMLTextAreaElement | null) => void;
  focusInput: () => void;
  setConfig: (config: TestConfig) => void;
  restart: () => void;
  repeat: () => void;
  resume: () => void;
}

interface TypingTestOptions {
  /** Keeps the distraction-free stage mounted when Tab loads fresh text. */
  onFocusedRestart?: () => void;
}

export function useTypingTest(
  initialConfig: TestConfig,
  { onFocusedRestart }: TypingTestOptions = {},
): TypingTest {
  const { settings, results } = useStore();

  const [config, setConfigState] = useState<TestConfig>(initialConfig);
  const [session, setSession] = useState<Session>(() =>
    startSession(initialConfig),
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  const [inputEl, setInputEl] = useState<HTMLTextAreaElement | null>(null);

  const engineRef = useRef(session.engine);
  const phaseRef = useRef<Phase>("idle");
  const performanceRef = useRef<PerformanceSnapshot[]>([]);
  const clockRef = useRef({ accumulated: 0, since: null as number | null });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const preparedRef = useRef<{ config: TestConfig; session: Session } | null>(
    null,
  );
  const stopOnErrorRef = useRef(settings.stopOnError);

  const attachInput = useCallback((element: HTMLTextAreaElement | null) => {
    inputRef.current = element;
    setInputEl(element);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Prepare the next passage after paint, outside the restart key's critical path.
  useEffect(() => {
    const prepare = () => {
      preparedRef.current = { config, session: startSession(config) };
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prepare, { timeout: 500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prepare, 0);
    return () => clearTimeout(id);
  }, [config, session.test]);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const elapsedNow = useCallback(() => {
    const { accumulated, since } = clockRef.current;
    return accumulated + (since !== null ? performance.now() - since : 0);
  }, []);

  const stopClock = useCallback(() => {
    const { since } = clockRef.current;
    if (since !== null) {
      clockRef.current.accumulated += performance.now() - since;
      clockRef.current.since = null;
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Loading a test                                                        */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(
    (next: TestConfig, reuse?: LoadedTest) => {
      const prepared = preparedRef.current;
      const fresh =
        !reuse && prepared?.config === next
          ? prepared.session
          : startSession(next, reuse);
      preparedRef.current = null;
      engineRef.current = fresh.engine;
      setSession(fresh);
      performanceRef.current = [];
      clockRef.current = { accumulated: 0, since: null };
      setElapsedMs(0);
      setResult(null);
      setRecorded(false);
      setPersonalBest(false);
      setPhaseBoth("idle");
    },
    [setPhaseBoth],
  );

  const setConfig = useCallback(
    (next: TestConfig) => {
      setConfigState(next);
      load(next);
      // Choosing a mode is an intent to type, so keep the keyboard live.
      focusInput();
    },
    [focusInput, load],
  );

  const restart = useCallback(() => {
    load(config);
    focusInput();
  }, [config, focusInput, load]);

  const repeat = useCallback(() => {
    load(config, session.test);
    focusInput();
  }, [config, focusInput, load, session.test]);

  /* ---------------------------------------------------------------------- */
  /* Finishing                                                             */
  /* ---------------------------------------------------------------------- */

  const finish = useCallback(
    (state: EngineState, cap?: number) => {
      if (phaseRef.current === "finished") return;
      stopClock();

      const raw = clockRef.current.accumulated;
      const elapsed = cap !== undefined ? Math.min(raw, cap) : raw;

      const history = buildPerformanceHistory(performanceRef.current, elapsed);

      setElapsedMs(elapsed);
      setPhaseBoth("finished");

      const built = buildResult({
        id: createId(),
        mode: config.mode,
        label: session.test.label,
        state,
        elapsedMs: elapsed,
        samples: history.samples,
        performance: history.performance,
        at: Date.now(),
        training: trainingFor(
          config,
          session.test.text,
          stopOnErrorRef.current,
        ),
      });

      setResult(built);

      if (isRecordable(state, elapsed)) {
        const sameMode = comparableResults(built, results);
        setPersonalBest(
          sameMode.length > 0 && sameMode.every((r) => r.wpm < built.wpm),
        );
        setRecorded(true);
        addResult(built);
      } else {
        setRecorded(false);
        setPersonalBest(false);
      }

      if (settings.sound) playClick("done");
    },
    [config, results, session.test, settings.sound, setPhaseBoth, stopClock],
  );

  /* ---------------------------------------------------------------------- */
  /* Clock                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "running") return;

    const limit =
      "seconds" in config && config.seconds ? config.seconds * 1000 : null;

    const tick = () => {
      const ms = elapsedNow();
      setElapsedMs(ms);

      if (limit !== null && ms >= limit) finish(engineRef.current, limit);
    };

    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [phase, config, elapsedNow, finish]);

  /* ---------------------------------------------------------------------- */
  /* Input                                                                 */
  /* ---------------------------------------------------------------------- */

  const pushChar = useCallback(
    (char: string) => {
      if (phaseRef.current === "finished") return;

      if (phaseRef.current === "paused") {
        clockRef.current.since = performance.now();
        setPhaseBoth("running");
      }

      const prev = engineRef.current;
      if (!prev.started) stopOnErrorRef.current = settings.stopOnError;
      const next = applyChar(prev, char, {
        stopOnError: stopOnErrorRef.current,
      });
      if (next === prev) return;

      engineRef.current = next;
      setSession((current) => ({ ...current, engine: next }));

      if (!prev.started && next.started) {
        clockRef.current = { accumulated: 0, since: performance.now() };
        setPhaseBoth("running");
      }

      performanceRef.current.push(
        createPerformanceSnapshot(next, !prev.started ? 0 : elapsedNow()),
      );

      if (settings.sound) {
        playClick(next.rejections > prev.rejections ? "error" : "key");
      }

      if (next.complete) finish(next);
    },
    [elapsedNow, finish, settings.sound, settings.stopOnError, setPhaseBoth],
  );

  const pushBackspace = useCallback(
    (wholeWord: boolean) => {
      if (phaseRef.current === "finished") return;
      const next = applyBackspace(engineRef.current, wholeWord);
      if (next === engineRef.current) return;
      engineRef.current = next;
      performanceRef.current.push(
        createPerformanceSnapshot(next, elapsedNow()),
      );
      setSession((current) => ({ ...current, engine: next }));
    },
    [elapsedNow],
  );

  const resume = useCallback(() => {
    if (phaseRef.current === "paused") {
      clockRef.current.since = performance.now();
      setPhaseBoth("running");
    }
    focusInput();
  }, [focusInput, setPhaseBoth]);

  // Native listeners: `beforeinput` is the reliable path on touch keyboards,
  // `keydown` covers physical keyboards and every control key.
  useEffect(() => {
    if (!inputEl) return;

    // Reset per keydown: when keydown handles a character it also calls
    // preventDefault, which stops `beforeinput` from firing at all. Clearing the
    // flag here keeps a stale `true` from swallowing the next touch-keyboard
    // insertion, where keydown reports an unidentified key.
    let handledByKeydown = false;

    const onKeyDown = (event: KeyboardEvent) => {
      handledByKeydown = false;
      if (phaseRef.current === "finished") return;
      if (event.ctrlKey || event.metaKey || event.altKey) {
        if (event.key === "Backspace") {
          event.preventDefault();
          pushBackspace(true);
        }
        return;
      }

      // Tab restarts, which is what typing apps do, but that would trap
      // keyboard users in the field. Shift+Tab is left alone so focus can always
      // move back out to the rest of the page.
      if (
        (event.key === "Tab" ||
          (event.key === "Enter" && phaseRef.current !== "paused")) &&
        !event.shiftKey
      ) {
        event.preventDefault();
        if (event.repeat) return;
        // Tab followed immediately by Enter is one restart, not two passages.
        if (event.key === "Enter" && phaseRef.current === "idle") return;
        if (phaseRef.current === "running" || phaseRef.current === "paused") {
          onFocusedRestart?.();
        }
        restart();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        pushBackspace(event.ctrlKey || event.altKey || event.metaKey);
        return;
      }
      if (event.key === "Enter" && phaseRef.current === "paused") {
        event.preventDefault();
        resume();
        return;
      }
      // Leave browser and OS shortcuts alone so Ctrl+R still reloads.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key.length === 1) {
        event.preventDefault();
        handledByKeydown = true;
        // A later touch insertion may have no keydown at all. Keep the guard
        // for this event only, rather than swallowing that next insertion.
        queueMicrotask(() => {
          handledByKeydown = false;
        });
        pushChar(event.key);
      }
    };

    const onBeforeInput = (event: Event) => {
      event.preventDefault();
      if (handledByKeydown) return;
      const input = event as InputEvent;
      if (input.inputType === "insertText" && input.data) {
        for (const char of input.data) pushChar(char);
      }
    };

    inputEl.addEventListener("keydown", onKeyDown);
    inputEl.addEventListener("beforeinput", onBeforeInput);
    return () => {
      inputEl.removeEventListener("keydown", onKeyDown);
      inputEl.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [inputEl, onFocusedRestart, pushBackspace, pushChar, restart, resume]);

  // Pause whenever the test loses focus, so time away never counts against a
  // score and nobody returns to a finished 60 second test.
  useEffect(() => {
    const pause = () => {
      if (phaseRef.current !== "running") return;
      stopClock();
      setPhaseBoth("paused");
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };

    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    inputEl?.addEventListener("blur", pause);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      inputEl?.removeEventListener("blur", pause);
    };
  }, [inputEl, setPhaseBoth, stopClock]);

  /* ---------------------------------------------------------------------- */
  /* Derived                                                               */
  /* ---------------------------------------------------------------------- */

  const { engine, test } = session;

  const live = useMemo(() => {
    if (!engine.started) return { wpm: 0, accuracy: 100 };
    const { correct } = countChars(engine);
    const minutes = Math.max(elapsedMs, 1) / 60000;
    return {
      wpm: Math.min(correct / 5 / minutes, MAX_WPM),
      accuracy:
        engine.keystrokes > 0
          ? (engine.correctKeystrokes / engine.keystrokes) * 100
          : 100,
    };
  }, [engine, elapsedMs]);

  const remaining =
    "seconds" in config && config.seconds
      ? Math.max(0, config.seconds - elapsedMs / 1000)
      : null;

  const progress =
    "seconds" in config && config.seconds
      ? Math.min(1, elapsedMs / (config.seconds * 1000))
      : engine.target.length > 0
        ? engine.cursor / engine.target.length
        : 0;

  return {
    phase,
    engine,
    text: test.text,
    label: test.label,
    meta: test.meta,
    config,
    elapsedMs,
    remaining,
    progress,
    liveWpm: live.wpm,
    liveAccuracy: live.accuracy,
    result,
    recorded,
    isPersonalBest: personalBest,
    attachInput,
    focusInput,
    setConfig,
    restart,
    repeat,
    resume,
  };
}
