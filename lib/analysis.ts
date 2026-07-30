import { COMMON_WORDS } from "./content";
import type { KeyTally } from "./engine";
import { ALL_KEYS } from "./keyboard";
import type { TestResult } from "./types";

/**
 * Everything Klack knows about a typist is derived here: per-key accuracy,
 * which keys are actually holding them back, and the drill that targets them.
 */

export function mergeKeyStats(results: TestResult[]): Record<string, KeyTally> {
  const out: Record<string, KeyTally> = {};
  for (const result of results) {
    for (const [char, tally] of Object.entries(result.keyStats)) {
      const prev = out[char] ?? { h: 0, m: 0 };
      out[char] = { h: prev.h + tally.h, m: prev.m + tally.m };
    }
  }
  return out;
}

export interface KeyScore {
  /** Physical key id from the layout, e.g. `a`, `semicolon`, `space`. */
  id: string;
  /** The unshifted character that identifies the finger movement. */
  char: string;
  attempts: number;
  misses: number;
  accuracy: number;
}

/** Rolls character stats up onto physical keys so `A` and `a` share a score. */
export function keyScores(stats: Record<string, KeyTally>): Map<string, KeyScore> {
  const byKey = new Map<string, KeyScore>();

  for (const key of ALL_KEYS) {
    let h = 0;
    let m = 0;
    for (const char of key.chars) {
      const tally = stats[char];
      if (tally) {
        h += tally.h;
        m += tally.m;
      }
    }
    const attempts = h + m;
    byKey.set(key.id, {
      id: key.id,
      char: key.chars[0],
      attempts,
      misses: m,
      accuracy: attempts > 0 ? (h / attempts) * 100 : 100,
    });
  }

  return byKey;
}

/** Below this many attempts a key's accuracy is noise, not a weakness. */
export const MIN_ATTEMPTS_FOR_WEAKNESS = 12;

/**
 * The keys worth practising: enough attempts to be trustworthy, ranked by how
 * many mistakes they actually caused rather than by percentage alone. A key you
 * miss 30 times matters more than one you missed once out of twelve.
 */
export function weakestKeys(
  results: TestResult[],
  limit = 5,
): KeyScore[] {
  const scores = [...keyScores(mergeKeyStats(results)).values()];
  return scores
    .filter((s) => s.attempts >= MIN_ATTEMPTS_FOR_WEAKNESS && s.misses > 0)
    .sort((a, b) => {
      const weightA = a.misses * (100 - a.accuracy);
      const weightB = b.misses * (100 - b.accuracy);
      if (weightB !== weightA) return weightB - weightA;
      return a.accuracy - b.accuracy;
    })
    .slice(0, limit);
}

/** How many results are needed before weak-key analysis has anything to say. */
export function hasEnoughDataForWeakKeys(results: TestResult[]): boolean {
  return weakestKeys(results, 1).length > 0;
}

/**
 * Keys fumbled in a single test. The attempt threshold is much lower than for
 * long-term analysis because one test is a small sample by definition, and here
 * we are only reporting what just happened rather than prescribing practice.
 */
export function worstKeysInResult(result: TestResult, limit = 4): KeyScore[] {
  return [...keyScores(result.keyStats).values()]
    .filter((s) => s.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.accuracy - b.accuracy)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Adaptive drill generation                                                  */
/* -------------------------------------------------------------------------- */

function shortWord() {
  const pool = COMMON_WORDS.filter((w) => w.length >= 3 && w.length <= 5);
  return pool[Math.floor(Math.random() * pool.length)];
}

function tokensForChar(char: string): string[] {
  if (/[a-z]/i.test(char)) {
    const lower = char.toLowerCase();
    const matches = COMMON_WORDS.filter((w) => w.includes(lower));
    if (matches.length >= 4) {
      // Favour words where the letter appears more than once.
      const dense = matches.filter(
        (w) => w.split(lower).length - 1 > 1 || w.length <= 5,
      );
      const pool = dense.length >= 4 ? dense : matches;
      return shuffle(pool).slice(0, 10);
    }
    return [lower.repeat(3), `${lower}${shortWord()}`, `${shortWord()}${lower}`];
  }

  if (/[0-9]/.test(char)) {
    return [
      `${char}${char}`,
      `1${char}`,
      `${char}0`,
      `${char}${char}${char}`,
      `${char}.${char}`,
    ];
  }

  // Punctuation and symbols: put them where they really appear, next to words.
  return [
    `${shortWord()}${char}`,
    `${char}${shortWord()}`,
    `${shortWord()}${char}${shortWord()}`,
    `${char}${char}`,
  ];
}

function shuffle<T>(list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface AdaptiveDrill {
  text: string;
  keys: string[];
}

/**
 * Builds a drill that cycles through the weak keys so no single one dominates,
 * which keeps the rhythm varied instead of drilling one letter into the ground.
 */
export function buildAdaptiveDrill(
  weak: KeyScore[],
  tokenCount = 36,
): AdaptiveDrill | null {
  if (weak.length === 0) return null;

  const pools = weak.map((k) => shuffle(tokensForChar(k.char)));
  const tokens: string[] = [];
  let i = 0;
  while (tokens.length < tokenCount) {
    const pool = pools[i % pools.length];
    tokens.push(pool[Math.floor(i / pools.length) % pool.length]);
    i++;
  }

  return {
    text: tokens.join(" "),
    keys: weak.map((k) => k.char),
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export interface Summary {
  tests: number;
  bestWpm: number;
  recentWpm: number;
  recentAccuracy: number;
  totalMs: number;
  totalWords: number;
  streak: number;
  activeDays: number;
  /** Change in average WPM: last 10 tests vs the 10 before them. */
  trend: number | null;
}

const EMPTY_SUMMARY: Summary = {
  tests: 0,
  bestWpm: 0,
  recentWpm: 0,
  recentAccuracy: 0,
  totalMs: 0,
  totalWords: 0,
  streak: 0,
  activeDays: 0,
  trend: null,
};

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Consecutive days with at least one test, counting back from today. */
export function currentStreak(results: TestResult[], now = Date.now()): number {
  if (results.length === 0) return 0;
  const days = new Set(results.map((r) => dayKey(r.at)));

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  // A streak stays alive until the end of the following day, so practising
  // yesterday but not yet today still counts.
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function summarise(results: TestResult[], now = Date.now()): Summary {
  if (results.length === 0) return EMPTY_SUMMARY;

  const byNewest = [...results].sort((a, b) => b.at - a.at);
  const recent = byNewest.slice(0, 10);
  const previous = byNewest.slice(10, 20);

  const recentWpm = mean(recent.map((r) => r.wpm));
  const trend =
    previous.length >= 3 ? recentWpm - mean(previous.map((r) => r.wpm)) : null;

  return {
    tests: results.length,
    bestWpm: Math.max(...results.map((r) => r.wpm)),
    recentWpm,
    recentAccuracy: mean(recent.map((r) => r.accuracy)),
    totalMs: results.reduce((acc, r) => acc + r.elapsedMs, 0),
    totalWords: results.reduce((acc, r) => acc + r.words, 0),
    streak: currentStreak(results, now),
    activeDays: new Set(results.map((r) => dayKey(r.at))).size,
    trend: trend === null ? null : Math.round(trend * 10) / 10,
  };
}

export interface DayActivity {
  key: string;
  date: Date;
  tests: number;
  bestWpm: number;
}

/** Activity for the last `days` days, oldest first, for the streak strip. */
export function recentActivity(
  results: TestResult[],
  days = 28,
  now = Date.now(),
): DayActivity[] {
  const buckets = new Map<string, TestResult[]>();
  for (const r of results) {
    const key = dayKey(r.at);
    const list = buckets.get(key);
    if (list) list.push(r);
    else buckets.set(key, [r]);
  }

  const out: DayActivity[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = dayKey(date.getTime());
    const hits = buckets.get(key) ?? [];
    out.push({
      key,
      date,
      tests: hits.length,
      bestWpm: hits.length ? Math.max(...hits.map((r) => r.wpm)) : 0,
    });
  }
  return out;
}

/** Personal best per mode, used on the progress page. */
export function bestByMode(results: TestResult[]): Map<TestResult["mode"], TestResult> {
  const out = new Map<TestResult["mode"], TestResult>();
  for (const r of results) {
    const existing = out.get(r.mode);
    if (!existing || r.wpm > existing.wpm) out.set(r.mode, r);
  }
  return out;
}

/** True when this result beats every earlier result of the same mode. */
export function isPersonalBest(result: TestResult, history: TestResult[]): boolean {
  return history
    .filter((r) => r.id !== result.id && r.mode === result.mode)
    .every((r) => r.wpm < result.wpm);
}
