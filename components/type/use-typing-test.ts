"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateTimedText,
  generateWordText,
  randomCode,
  randomProse,
} from "@/lib/content";
import {
  applyBackspace,
  applyChar,
  buildResult,
  countChars,
  createEngine,
  isRecordable,
  MAX_WPM,
  type EngineState,
} from "@/lib/engine";
import { createId } from "@/lib/format";
import { playClick } from "@/lib/sound";
import { addResult, useStore } from "@/lib/store";
import type { TestResult } from "@/lib/types";

/**
 * A config fully determines the text of a test. Punctuation and numbers live
 * here rather than being read from settings at generation time, so toggling them
 * is an explicit "load a new test" action instead of a hidden side effect.
 */
export type TestConfig =
  | { mode: "time"; seconds: number; punctuation: boolean; numbers: boolean }
  | { mode: "words"; count: number; punctuation: boolean; numbers: boolean }
  | { mode: "quote" }
  | { mode: "code" }
  | { mode: "drill"; id: string; name: string; text: string; keys?: string[] };

export type Phase = "idle" | "running" | "paused" | "finished";

interface LoadedTest {
  text: string;
  label: string;
  /** Attribution or language tag shown under the text. */
  meta?: string;
}

function loadTest(config: TestConfig): LoadedTest {
  switch (config.mode) {
    case "time":
      return {
        text: generateTimedText({
          punctuation: config.punctuation,
          numbers: config.numbers,
        }),
        label: `${config.seconds}s`,
      };
    case "words":
      return {
        text: generateWordText({
          count: config.count,
          punctuation: config.punctuation,
          numbers: config.numbers,
        }),
        label: `${config.count} words`,
      };
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

export function useTypingTest(initialConfig: TestConfig): TypingTest {
  const { settings, results } = useStore();

  const [config, setConfigState] = useState<TestConfig>(initialConfig);
  const [session, setSession] = useState<Session>(() => startSession(initialConfig));
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  const [inputEl, setInputEl] = useState<HTMLTextAreaElement | null>(null);

  const engineRef = useRef(session.engine);
  const phaseRef = useRef<Phase>("idle");
  const samplesRef = useRef<number[]>([]);
  const lastSampleCharsRef = useRef(0);
  const clockRef = useRef({ accumulated: 0, since: null as number | null });

  const attachInput = useCallback((element: HTMLTextAreaElement | null) => {
    setInputEl(element);
  }, []);

  const focusInput = useCallback(() => {
    inputEl?.focus();
  }, [inputEl]);

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
      const fresh = startSession(next, reuse);
      engineRef.current = fresh.engine;
      setSession(fresh);
      samplesRef.current = [];
      lastSampleCharsRef.current = 0;
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
      inputEl?.focus();
    },
    [inputEl, load],
  );

  const restart = useCallback(() => {
    load(config);
    inputEl?.focus();
  }, [config, inputEl, load]);

  const repeat = useCallback(() => {
    load(config, session.test);
    inputEl?.focus();
  }, [config, inputEl, load, session.test]);

  /* ---------------------------------------------------------------------- */
  /* Finishing                                                             */
  /* ---------------------------------------------------------------------- */

  const finish = useCallback(
    (state: EngineState, cap?: number) => {
      if (phaseRef.current === "finished") return;
      stopClock();

      const raw = clockRef.current.accumulated;
      const elapsed = cap !== undefined ? Math.min(raw, cap) : raw;

      // Close out the partial final second so consistency covers the whole run.
      const wholeSeconds = Math.floor(elapsed / 1000);
      const remainder = elapsed - wholeSeconds * 1000;
      if (remainder > 400) {
        const correct = countChars(state).correct;
        const delta = correct - lastSampleCharsRef.current;
        samplesRef.current.push(Math.max(0, (delta / 5) * (60000 / remainder)));
      }

      setElapsedMs(elapsed);
      setPhaseBoth("finished");

      const built = buildResult({
        id: createId(),
        mode: config.mode,
        label: session.test.label,
        state,
        elapsedMs: elapsed,
        samples: samplesRef.current,
        at: Date.now(),
      });

      setResult(built);

      if (isRecordable(state, elapsed)) {
        const sameMode = results.filter((r) => r.mode === built.mode);
        setPersonalBest(sameMode.length > 0 && sameMode.every((r) => r.wpm < built.wpm));
        setRecorded(true);
        addResult(built);
      } else {
        setRecorded(false);
        setPersonalBest(false);
      }

      if (settings.sound) playClick("done");
    },
    [config.mode, results, session.test.label, settings.sound, setPhaseBoth, stopClock],
  );

  /* ---------------------------------------------------------------------- */
  /* Clock                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "running") return;

    const limit = config.mode === "time" ? config.seconds * 1000 : null;

    const tick = () => {
      const ms = elapsedNow();
      setElapsedMs(ms);

      const seconds = Math.floor(ms / 1000);
      while (samplesRef.current.length < seconds) {
        const correct = countChars(engineRef.current).correct;
        const delta = correct - lastSampleCharsRef.current;
        lastSampleCharsRef.current = correct;
        samplesRef.current.push(Math.max(0, (delta / 5) * 60));
      }

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
      const next = applyChar(prev, char, { stopOnError: settings.stopOnError });
      if (next === prev) return;

      engineRef.current = next;
      setSession((current) => ({ ...current, engine: next }));

      if (!prev.started && next.started) {
        clockRef.current = { accumulated: 0, since: performance.now() };
        setPhaseBoth("running");
      }

      if (settings.sound) {
        playClick(next.rejections > prev.rejections ? "error" : "key");
      }

      if (next.complete) finish(next);
    },
    [finish, settings.sound, settings.stopOnError, setPhaseBoth],
  );

  const pushBackspace = useCallback((wholeWord: boolean) => {
    if (phaseRef.current === "finished") return;
    const next = applyBackspace(engineRef.current, wholeWord);
    if (next === engineRef.current) return;
    engineRef.current = next;
    setSession((current) => ({ ...current, engine: next }));
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current === "paused") {
      clockRef.current.since = performance.now();
      setPhaseBoth("running");
    }
    inputEl?.focus();
  }, [inputEl, setPhaseBoth]);

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

      // Tab restarts, which is what typing apps do, but that would trap
      // keyboard users in the field. Shift+Tab is left alone so focus can always
      // move back out to the rest of the page.
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        restart();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        repeat();
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
  }, [inputEl, pushBackspace, pushChar, repeat, restart, resume]);

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
    config.mode === "time" ? Math.max(0, config.seconds - elapsedMs / 1000) : null;

  const progress =
    config.mode === "time"
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
