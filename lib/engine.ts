import type { TestResult } from "./types";

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
  /** Set on the first accepted keystroke, used to start the clock. */
  started: boolean;
  /** True once the cursor passes the final character. */
  complete: boolean;
  /** Bumped whenever a keystroke is rejected, so the UI can flash. */
  rejections: number;
}

export function createEngine(target: string): EngineState {
  return {
    target,
    states: new Array<CharState>(target.length).fill("pending"),
    cursor: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    keyStats: {},
    started: false,
    complete: false,
    rejections: 0,
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
        keystrokes: state.keystrokes + 1,
        keyStats: tally(state.keyStats, expected, false),
        rejections: state.rejections + 1,
        started: true,
      };
    }

    const states = state.states.slice();
    let keyStats = state.keyStats;
    for (let i = state.cursor; i < nextSpace; i++) {
      if (states[i] === "pending") {
        states[i] = "skipped";
        keyStats = tally(keyStats, state.target[i], false);
      }
    }
    states[nextSpace] = "correct";

    const cursor = nextSpace + 1;
    return {
      ...state,
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
    states,
    cursor,
    keystrokes: state.keystrokes + 1,
    correctKeystrokes: state.correctKeystrokes + (correct ? 1 : 0),
    keyStats: tally(state.keyStats, expected, correct),
    started: true,
    complete: cursor >= state.target.length,
  };
}

function rangeIsCorrect(states: CharState[], start: number, end: number): boolean {
  for (let index = start; index < end; index++) {
    if (states[index] !== "correct") return false;
  }
  return true;
}

/** Steps back one character, or clears the current unfinished/incorrect word. */
export function applyBackspace(state: EngineState, wholeWord = false): EngineState {
  if (state.cursor === 0) return state;

  let target = state.cursor - 1;
  if (wholeWord) {
    const previousIndex = state.cursor - 1;

    if (state.target[previousIndex] === " ") {
      const previousWordStart = state.target.lastIndexOf(" ", previousIndex - 1) + 1;
      const previousWordCorrect = rangeIsCorrect(
        state.states,
        previousWordStart,
        previousIndex,
      );

      // A committed correct word is a boundary, just like Monkeytype's default
      // behavior. If only its separator was wrong, clear the separator without
      // touching the word itself. Incorrect words remain available for repair.
      if (previousWordCorrect && state.states[previousIndex] === "correct") return state;
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
    else if (state.states[i] === "wrong" || state.states[i] === "skipped") incorrect++;
  }
  return { correct, incorrect };
}

export function grossWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (correctChars / CHARS_PER_WORD) / (elapsedMs / 60000);
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
  const rawWpm = minutes > 0 ? (correct + incorrect) / CHARS_PER_WORD / minutes : 0;
  const accuracy =
    state.keystrokes > 0 ? (state.correctKeystrokes / state.keystrokes) * 100 : 0;

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

/** Tests below this bar are practice keystrokes, not results worth keeping. */
export const MIN_RECORDED_MS = 3000;
export const MIN_RECORDED_KEYSTROKES = 10;

export function isRecordable(state: EngineState, elapsedMs: number): boolean {
  return elapsedMs >= MIN_RECORDED_MS && state.keystrokes >= MIN_RECORDED_KEYSTROKES;
}

export function buildResult(args: {
  id: string;
  mode: TestResult["mode"];
  label: string;
  state: EngineState;
  elapsedMs: number;
  samples: number[];
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
  };
}
