"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { RaceFinish, RaceStart } from "@/lib/race";
import { playClick } from "@/lib/sound";
import { addResult } from "@/lib/store";
import type { Settings, TestResult } from "@/lib/types";

export type RaceTypingPhase = "waiting" | "countdown" | "running" | "finished";

export interface RaceLiveSnapshot {
  cursor: number;
  progress: number;
  wpm: number;
  accuracy: number;
}

export function useRaceTyping({
  start,
  settings,
  onProgress,
  onFinish,
}: {
  start: RaceStart | null;
  settings: Settings;
  onProgress: (snapshot: RaceLiveSnapshot) => void;
  onFinish: (summary: Omit<RaceFinish, "version" | "raceId" | "playerId">) => void;
}) {
  const [engine, setEngine] = useState<EngineState>(() => createEngine("Waiting for race"));
  const [phase, setPhase] = useState<RaceTypingPhase>("waiting");
  const [countdown, setCountdown] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [inputEl, setInputEl] = useState<HTMLTextAreaElement | null>(null);

  const engineRef = useRef(engine);
  const phaseRef = useRef<RaceTypingPhase>("waiting");
  const startRef = useRef<RaceStart | null>(null);
  const startAtRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const lastSampleCharsRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onFinishRef.current = onFinish;
  }, [onFinish, onProgress]);

  const setPhaseBoth = useCallback((next: RaceTypingPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const attachInput = useCallback((element: HTMLTextAreaElement | null) => {
    setInputEl(element);
  }, []);

  const focusInput = useCallback(() => {
    inputEl?.focus();
  }, [inputEl]);

  const elapsedNow = useCallback(() => {
    if (!startRef.current || startAtRef.current === 0) return 0;
    return Math.max(0, performance.now() - startAtRef.current);
  }, []);

  const finish = useCallback(
    (state: EngineState, cappedElapsed?: number) => {
      if (phaseRef.current === "finished") return;
      const activeStart = startRef.current;
      if (!activeStart) return;

      const elapsed = cappedElapsed ?? elapsedNow();
      const built = buildResult({
        id: createId(),
        mode: "time",
        label: `1v1 ${activeStart.config.duration}s`,
        state,
        elapsedMs: elapsed,
        samples: samplesRef.current,
        at: Date.now(),
      });

      const shouldRecord = isRecordable(state, elapsed);
      if (shouldRecord) addResult(built);
      setRecorded(shouldRecord);
      setElapsedMs(elapsed);
      setResult(built);
      setPhaseBoth("finished");

      onFinishRef.current({
        wpm: built.wpm,
        accuracy: built.accuracy,
        correctChars: built.correctChars,
        progress: activeStart.config.text.length
          ? Math.min(1, state.cursor / activeStart.config.text.length)
          : 0,
      });

      if (settings.sound) playClick("done");
    },
    [elapsedNow, setPhaseBoth, settings.sound],
  );

  useEffect(() => {
    if (!start || startRef.current?.raceId === start.raceId) return;

    const sharedStartAt = performance.now() + start.countdownMs;
    let countdownId: number | null = null;
    const setupId = window.setTimeout(() => {
      if (startRef.current?.raceId === start.raceId) return;

      startRef.current = start;
      const fresh = createEngine(start.config.text);
      engineRef.current = fresh;
      setEngine(fresh);
      samplesRef.current = [];
      lastSampleCharsRef.current = 0;
      startAtRef.current = sharedStartAt;
      setElapsedMs(0);
      setResult(null);
      setRecorded(false);
      setCountdown(Math.ceil(start.countdownMs / 1000));
      setPhaseBoth("countdown");

      countdownId = window.setInterval(() => {
        const left = startAtRef.current - performance.now();
        if (left <= 0) {
          if (countdownId !== null) window.clearInterval(countdownId);
          setCountdown(0);
          setPhaseBoth("running");
          return;
        }
        setCountdown(Math.ceil(left / 1000));
      }, 50);
    }, 0);

    return () => {
      window.clearTimeout(setupId);
      if (countdownId !== null) window.clearInterval(countdownId);
    };
  }, [setPhaseBoth, start]);

  useEffect(() => {
    if (phase !== "running") return;
    inputEl?.focus();

    const limit = (startRef.current?.config.duration ?? 60) * 1000;
    const tick = () => {
      const elapsed = Math.min(limit, elapsedNow());
      setElapsedMs(elapsed);

      const seconds = Math.floor(elapsed / 1000);
      while (samplesRef.current.length < seconds) {
        const correct = countChars(engineRef.current).correct;
        const delta = correct - lastSampleCharsRef.current;
        lastSampleCharsRef.current = correct;
        samplesRef.current.push(Math.max(0, (delta / 5) * 60));
      }

      if (elapsed >= limit) finish(engineRef.current, limit);
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [elapsedNow, finish, inputEl, phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const publish = () => {
      const state = engineRef.current;
      const elapsed = Math.max(1, elapsedNow());
      const correct = countChars(state).correct;
      onProgressRef.current({
        cursor: state.cursor,
        progress: state.target.length ? Math.min(1, state.cursor / state.target.length) : 0,
        wpm: Math.min(MAX_WPM, correct / 5 / (elapsed / 60000)),
        accuracy:
          state.keystrokes > 0 ? (state.correctKeystrokes / state.keystrokes) * 100 : 100,
      });
    };

    publish();
    const id = window.setInterval(publish, 250);
    return () => window.clearInterval(id);
  }, [elapsedNow, phase]);

  const pushChar = useCallback(
    (char: string) => {
      if (phaseRef.current !== "running") return;
      const previous = engineRef.current;
      const next = applyChar(previous, char, { stopOnError: false });
      if (next === previous) return;

      engineRef.current = next;
      setEngine(next);
      if (settings.sound) {
        playClick(next.rejections > previous.rejections ? "error" : "key");
      }
      if (next.complete) finish(next);
    },
    [finish, settings.sound],
  );

  const pushBackspace = useCallback((wholeWord: boolean) => {
    if (phaseRef.current !== "running") return;
    const next = applyBackspace(engineRef.current, wholeWord);
    if (next === engineRef.current) return;
    engineRef.current = next;
    setEngine(next);
  }, []);

  useEffect(() => {
    if (!inputEl) return;
    let handledByKeydown = false;

    const onKeyDown = (event: KeyboardEvent) => {
      handledByKeydown = false;
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        pushBackspace(event.ctrlKey || event.altKey || event.metaKey);
        return;
      }
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
  }, [inputEl, pushBackspace, pushChar]);

  const live = useMemo(() => {
    const correct = countChars(engine).correct;
    const minutes = Math.max(1, elapsedMs) / 60000;
    return {
      wpm: Math.min(MAX_WPM, correct / 5 / minutes),
      accuracy:
        engine.keystrokes > 0 ? (engine.correctKeystrokes / engine.keystrokes) * 100 : 100,
      progress: engine.target.length ? Math.min(1, engine.cursor / engine.target.length) : 0,
    };
  }, [elapsedMs, engine]);

  const durationMs = (start?.config.duration ?? 60) * 1000;

  return {
    phase,
    countdown,
    engine,
    elapsedMs,
    remainingMs: Math.max(0, durationMs - elapsedMs),
    wpm: live.wpm,
    accuracy: live.accuracy,
    progress: live.progress,
    result,
    recorded,
    attachInput,
    focusInput,
  };
}
