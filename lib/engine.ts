import type { PerformanceSeries, TestResult, Training } from "./types";

/**
 * The typing engine. Pure functions over an immutable-ish state object so the
 * scoring rules can be reasoned about (and unit-tested) without React.
 */

export type CharState = "pending" | "correct" | "wrong" | "skipped";

export type KeyTally = { h: number; m: number };

export interface EngineState {
  target: string;
  states: CharState[];
  /** Index of the next character to type. Equals target.length when complete. */
  cursor: number;
  /** Every printable key press, including ones that were rejected. */
  keystrokes: number;
  correctKeystrokes: number;
  keyStats: Record<string, KeyTally>;
  pairStats: Record<string, KeyTally>;
  wordAt: number[];
  wordTokens: string[];
  wordMisses: Record<number, number>;
  /** Set on the first accepted keystroke, used to start the clock. */
  started: boolean;
  /** True once the cursor passes the final character. */
  complete: boolean;
  /** Bumped whenever a keystroke is rejected, so the UI can flash. */
  rejections: number;
}

export function createEngine(target: string): EngineState {
  const wordAt = new Array<number>(target.length).fill(-1);
  const wordTokens: string[] = [];
  for (const match of target.matchAll(/\S+/g)) {
    const id = wordTokens.push(match[0]) - 1;
    for (
      let i = match.index;
      i <= match.index + match[0].length && i < target.length;
      i++
    ) {
      wordAt[i] = id;
    }
  }
  return {
    target,
    states: new Array<CharState>(target.length).fill("pending"),
    cursor: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    keyStats: {},
    pairStats: {},
    wordAt,
    wordTokens,
    wordMisses: {},
    started: false,
    complete: false,
    rejections: 0,
  };
}

function recordAttempt(state: EngineState, index: number, hit: boolean) {
  let pairStats = state.pairStats;
  const pair = state.target.slice(index - 1, index + 1);
  if (index > 0 && !/\s/.test(pair)) {
    pairStats = tally(
      pairStats,
      pair,
      hit && state.states[index - 1] === "correct",
    );
  }
  const word = state.wordAt[index];
  return {
    pairStats,
    wordMisses:
      !hit && word >= 0
        ? { ...state.wordMisses, [word]: (state.wordMisses[word] ?? 0) + 1 }
        : state.wordMisses,
  };
}

function tally(
  keyStats: Record<string, KeyTally>,
  char: string,
  hit: boolean,
): Record<string, KeyTally> {
  const prev = keyStats[char] ?? { h: 0, m: 0 };
  return {
    ...keyStats,
    [char]: hit ? { h: prev.h + 1, m: prev.m } : { h: prev.h, m: prev.m + 1 },
  };
}

export interface ApplyOptions {
  /** When true, a wrong character is rejected instead of being recorded. */
  stopOnError: boolean;
}

/**
 * Applies one printable character.
 *
 * Space is special: pressing it mid-word means "I'm moving on", so the rest of
 * the word is marked skipped and the cursor jumps past the next space. Skipped
 * characters count against accuracy, which is what makes the shortcut a
 * trade-off rather than a free pass.
 */
export function applyChar(
  state: EngineState,
  char: string,
  { stopOnError }: ApplyOptions,
): EngineState {
  if (state.complete || state.cursor >= state.target.length) return state;

  const expected = state.target[state.cursor];

  if (char === " " && expected !== " ") {
    const nextSpace = state.target.indexOf(" ", state.cursor);
    if (nextSpace === -1) {
      // Last word of the text: nothing to skip to, so treat it as a rejection.
      return {
        ...state,
        ...recordAttempt(state, state.cursor, false),
        keystrokes: state.keystrokes + 1,
        keyStats: tally(state.keyStats, expected, false),
        rejections: state.rejections + 1,
        started: true,
      };
    }

    const states = state.states.slice();
    let keyStats = state.keyStats;
    let training = { pairStats: state.pairStats, wordMisses: state.wordMisses };
    for (let i = state.cursor; i < nextSpace; i++) {
      if (states[i] === "pending") {
        states[i] = "skipped";
        keyStats = tally(keyStats, state.target[i], false);
        training = recordAttempt({ ...state, ...training }, i, false);
      }
    }
    states[nextSpace] = "correct";

    const cursor = nextSpace + 1;
    return {
      ...state,
      ...training,
      states,
      keyStats: tally(keyStats, " ", true),
      cursor,
      keystrokes: state.keystrokes + 1,
      correctKeystrokes: state.correctKeystrokes + 1,
      started: true,
      complete: cursor >= state.target.length,
    };
  }

  const correct = char === expected;

  if (!correct && stopOnError) {
    return {
      ...state,
      ...recordAttempt(state, state.cursor, false),
      keystrokes: state.keystrokes + 1,
      keyStats: tally(state.keyStats, expected, false),
      rejections: state.rejections + 1,
      started: true,
    };
  }

  const states = state.states.slice();
  states[state.cursor] = correct ? "correct" : "wrong";
  const cursor = state.cursor + 1;

  return {
    ...state,
    ...recordAttempt(state, state.cursor, correct),
    states,
    cursor,
    keystrokes: state.keystrokes + 1,
    correctKeystrokes: state.correctKeystrokes + (correct ? 1 : 0),
    keyStats: tally(state.keyStats, expected, correct),
    started: true,
    complete: cursor >= state.target.length,
  };
}

function rangeIsCorrect(
  states: CharState[],
  start: number,
  end: number,
): boolean {
  for (let index = start; index < end; index++) {
    if (states[index] !== "correct") return false;
  }
  return true;
}

/** Steps back one character, or clears the current unfinished/incorrect word. */
export function applyBackspace(
  state: EngineState,
  wholeWord = false,
): EngineState {
  if (state.cursor === 0) return state;

  let target = state.cursor - 1;
  if (wholeWord) {
    const previousIndex = state.cursor - 1;

    if (state.target[previousIndex] === " ") {
      const previousWordStart =
        state.target.lastIndexOf(" ", previousIndex - 1) + 1;
      const previousWordCorrect = rangeIsCorrect(
        state.states,
        previousWordStart,
        previousIndex,
      );

      // A committed correct word is a boundary, just like Monkeytype's default
      // behavior. If only its separator was wrong, clear the separator without
      // touching the word itself. Incorrect words remain available for repair.
      if (previousWordCorrect && state.states[previousIndex] === "correct")
        return state;
      target = previousWordCorrect ? previousIndex : previousWordStart;
    } else {
      const currentWordStart = state.target.lastIndexOf(" ", previousIndex) + 1;
      const nextSpace = state.target.indexOf(" ", currentWordStart);
      const currentWordEnd = nextSpace === -1 ? state.target.length : nextSpace;
      const currentWordCorrect =
        state.cursor >= currentWordEnd &&
        rangeIsCorrect(state.states, currentWordStart, currentWordEnd);

      // Ctrl+Backspace is for repairing the word being typed. Once every
      // character in that word is correct, it cannot erase the word wholesale.
      if (currentWordCorrect) return state;
      target = currentWordStart;
    }
  }

  const states = state.states.slice();
  for (let i = target; i < state.cursor; i++) states[i] = "pending";

  return { ...state, states, cursor: target, complete: false };
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export interface Scores {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  words: number;
}

/** A "word" is the standard five characters, so scores compare across texts. */
const CHARS_PER_WORD = 5;

/**
 * Upper bound on a reported speed. The fastest recorded humans sit around
 * 300 wpm, so anything past this came from a pathologically short elapsed time
 * (a test finished in a couple of milliseconds, a suspended tab resuming, a
 * clock jump) rather than from typing. Clamping here keeps one bad reading out
 * of the stored history and off the charts.
 */
export const MAX_WPM = 400;

export function countChars(state: EngineState) {
  let correct = 0;
  let incorrect = 0;
  for (let i = 0; i < state.cursor; i++) {
    if (state.states[i] === "correct") correct++;
    else if (state.states[i] === "wrong" || state.states[i] === "skipped")
      incorrect++;
  }
  return { correct, incorrect };
}

function countErrors(state: EngineState): number {
  return Math.max(0, state.keystrokes - state.correctKeystrokes);
}

export function grossWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return correctChars / CHARS_PER_WORD / (elapsedMs / 60000);
}

/**
 * Consistency is the inverse coefficient of variation of the per-second WPM
 * samples: a metronome-steady run scores 100, a stop-start run scores low.
 */
export function consistencyOf(samples: number[]): number {
  if (samples.length < 3) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (mean <= 0) return 0;
  const variance =
    samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, (1 - cv) * 100));
}

export function score(
  state: EngineState,
  elapsedMs: number,
  samples: number[],
): Scores {
  const { correct, incorrect } = countChars(state);
  const minutes = elapsedMs / 60000;
  const wpm = minutes > 0 ? correct / CHARS_PER_WORD / minutes : 0;
  const rawWpm = minutes > 0 ? state.keystrokes / CHARS_PER_WORD / minutes : 0;
  const accuracy =
    state.keystrokes > 0
      ? (state.correctKeystrokes / state.keystrokes) * 100
      : 0;

  return {
    wpm: round1(Math.min(wpm, MAX_WPM)),
    rawWpm: round1(Math.min(rawWpm, MAX_WPM)),
    accuracy: round1(accuracy),
    consistency: round1(consistencyOf(samples)),
    correctChars: correct,
    incorrectChars: incorrect,
    words: Math.round(correct / CHARS_PER_WORD),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** A lightweight transient snapshot. Only the compact sampled series is persisted. */
export interface PerformanceSnapshot {
  elapsedMs: number;
  correctChars: number;
  incorrectChars: number;
  keystrokes: number;
  errors: number;
}

export function createPerformanceSnapshot(
  state: EngineState,
  elapsedMs: number,
): PerformanceSnapshot {
  const chars = countChars(state);
  return {
    elapsedMs: Math.max(0, elapsedMs),
    correctChars: chars.correct,
    incorrectChars: chars.incorrect,
    keystrokes: state.keystrokes,
    errors: countErrors(state),
  };
}

export interface PerformanceHistory {
  /** Interval net pace retained for the existing consistency calculation. */
  samples: number[];
  /** Cumulative net/raw plus interval burst/errors, matching Monkeytype's chart. */
  performance: PerformanceSeries;
}

const EMPTY_SNAPSHOT: PerformanceSnapshot = {
  elapsedMs: 0,
  correctChars: 0,
  incorrectChars: 0,
  keystrokes: 0,
  errors: 0,
};

/**
 * Builds an ideal one-second grid from input snapshots. Cumulative WPM and raw
 * WPM describe progress up to each boundary; burst and errors describe only
 * the interval ending at that boundary. Like Monkeytype, a final partial bucket
 * is kept once it reaches half a second.
 */
export function buildPerformanceHistory(
  snapshots: PerformanceSnapshot[],
  elapsedMs: number,
): PerformanceHistory {
  const elapsed = Math.max(0, elapsedMs);
  const fullSeconds = Math.floor(elapsed / 1000);
  const boundaries = Array.from(
    { length: fullSeconds },
    (_, index) => (index + 1) * 1000,
  );
  const remainder = elapsed - fullSeconds * 1000;
  if (remainder >= 500) boundaries.push(elapsed);

  const performance: PerformanceSeries = {
    elapsedMs: [],
    wpm: [],
    rawWpm: [],
    burst: [],
    errors: [],
  };
  const samples: number[] = [];

  let snapshotIndex = 0;
  let current = EMPTY_SNAPSHOT;
  let previous = EMPTY_SNAPSHOT;
  let previousBoundary = 0;

  for (const boundary of boundaries.slice(0, 600)) {
    while (
      snapshotIndex < snapshots.length &&
      snapshots[snapshotIndex]!.elapsedMs <= boundary
    ) {
      current = snapshots[snapshotIndex]!;
      snapshotIndex++;
    }

    const intervalMs = boundary - previousBoundary;
    const intervalCorrect = Math.max(
      0,
      current.correctChars - previous.correctChars,
    );
    const intervalKeystrokes = Math.max(
      0,
      current.keystrokes - previous.keystrokes,
    );
    const intervalErrors = Math.max(0, current.errors - previous.errors);

    samples.push(
      round1(Math.min(MAX_WPM, grossWpm(intervalCorrect, intervalMs))),
    );
    performance.elapsedMs.push(Math.round(boundary));
    performance.wpm.push(
      round1(Math.min(MAX_WPM, grossWpm(current.correctChars, boundary))),
    );
    performance.rawWpm.push(
      round1(Math.min(MAX_WPM, grossWpm(current.keystrokes, boundary))),
    );
    performance.burst.push(
      round1(Math.min(MAX_WPM, grossWpm(intervalKeystrokes, intervalMs))),
    );
    performance.errors.push(intervalErrors);

    previous = current;
    previousBoundary = boundary;
  }

  return { samples, performance };
}

/** Tests below this bar are practice keystrokes, not results worth keeping. */
export const MIN_RECORDED_MS = 3000;
export const MIN_RECORDED_KEYSTROKES = 10;

export function isRecordable(state: EngineState, elapsedMs: number): boolean {
  return (
    elapsedMs >= MIN_RECORDED_MS && state.keystrokes >= MIN_RECORDED_KEYSTROKES
  );
}

export function buildResult(args: {
  id: string;
  mode: TestResult["mode"];
  label: string;
  state: EngineState;
  elapsedMs: number;
  samples: number[];
  performance?: PerformanceSeries;
  training?: Omit<Training, "missedWords" | "pairStats">;
  at: number;
}): TestResult {
  const s = score(args.state, args.elapsedMs, args.samples);
  return {
    id: args.id,
    at: args.at,
    mode: args.mode,
    label: args.label,
    elapsedMs: Math.round(args.elapsedMs),
    wpm: s.wpm,
    rawWpm: s.rawWpm,
    accuracy: s.accuracy,
    consistency: s.consistency,
    correctChars: s.correctChars,
    incorrectChars: s.incorrectChars,
    keystrokes: args.state.keystrokes,
    correctKeystrokes: args.state.correctKeystrokes,
    words: s.words,
    keyStats: args.state.keyStats,
    samples: args.samples.map(round1).slice(0, 600),
    training: args.training
      ? {
          ...args.training,
          missedWords: Object.entries(args.state.wordMisses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 40)
            .map(([index, misses]) => ({
              word: args.state.wordTokens[Number(index)].slice(0, 200),
              misses,
            })),
          pairStats: Object.fromEntries(
            Object.entries(args.state.pairStats).slice(0, 512),
          ),
        }
      : undefined,
    performance: args.performance ?? {
      elapsedMs: [],
      wpm: [],
      rawWpm: [],
      burst: [],
      errors: [],
    },
  };
}
