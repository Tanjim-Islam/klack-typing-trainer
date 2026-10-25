import { COMMON_WORDS, generateTimedText } from "./content";
import { dayKey } from "./analysis";
import type { KeyTally } from "./engine";
import type { TestResult, Training } from "./types";

export type TestConfig = (
  | { mode: "time"; seconds: number; punctuation: boolean; numbers: boolean }
  | { mode: "words"; count: number; punctuation: boolean; numbers: boolean }
  | { mode: "quote" }
  | { mode: "code" }
  | {
      mode: "drill";
      id: string;
      name: string;
      text: string;
      keys?: string[];
      seconds?: number;
    }
) & { source?: Training["source"]; daily?: Training["daily"] };

export interface PracticeTarget {
  token: string;
  kind: "key" | "pair";
  attempts: number;
  misses: number;
  accuracy: number;
}

/** Each target uses its last 40 attempts, from at most 20 recent tests.
 * A clean recent drill retires a target even if older tests were difficult. */
export function practiceTargets(
  results: TestResult[],
  limit = 5,
): PracticeTarget[] {
  const totals = new Map<string, KeyTally>();
  for (const result of [...results].sort((a, b) => b.at - a.at).slice(0, 20)) {
    for (const [kind, stats] of [
      ["key", result.keyStats],
      ["pair", result.training?.pairStats ?? {}],
    ] as const) {
      for (const [token, tally] of Object.entries(stats)) {
        if (/\s/.test(token)) continue;
        const id = `${kind}:${token}`;
        const total = totals.get(id) ?? { h: 0, m: 0 };
        const room = Math.max(0, 40 - total.h - total.m);
        const scale = Math.min(1, room / Math.max(1, tally.h + tally.m));
        totals.set(id, {
          h: total.h + tally.h * scale,
          m: total.m + tally.m * scale,
        });
      }
    }
  }
  return [...totals]
    .map(([id, tally]): PracticeTarget => ({
      kind: id.startsWith("key:") ? "key" : "pair",
      token: id.slice(id.indexOf(":") + 1),
      attempts: tally.h + tally.m,
      misses: tally.m,
      accuracy: (100 * tally.h) / (tally.h + tally.m),
    }))
    .filter(
      (target) =>
        target.attempts >= (target.kind === "pair" ? 6 : 8) &&
        target.accuracy < 97,
    )
    .sort(
      (a, b) => b.misses * (100 - b.accuracy) - a.misses * (100 - a.accuracy),
    )
    .slice(0, limit);
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function targetWords(token: string): string[] {
  const lower = token.toLowerCase();
  const matches = COMMON_WORDS.filter((word) => word.includes(lower));
  if (/^[a-z]+$/i.test(token) && matches.length) {
    return shuffled(matches)
      .slice(0, 30)
      .map((word) => word.replace(lower, token));
  }
  if (token === ":")
    return ["time:", "note:", "key:", "name:", "10:30", "12:45", "value:"];
  if (/^[0-9]+$/.test(token))
    return [token, `${token}0`, `1${token}`, `${token}.5`];
  return [`${token}test`, `one${token}`, `key${token}value`, token];
}

export function practiceText(
  tokens: string[],
  missedWords: string[] = [],
  count = 40,
): string {
  const pools = [
    ...tokens.map(targetWords),
    ...(missedWords.length ? [shuffled(missedWords)] : []),
  ];
  if (!pools.length) pools.push(shuffled(COMMON_WORDS).slice(0, 50));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const pool = pools[i % pools.length];
    words.push(pool[Math.floor(i / pools.length) % pool.length]);
  }
  return words.join(" ");
}

export function repairConfig(result: TestResult): TestConfig | null {
  const keys = Object.entries(result.keyStats)
    .filter(([, tally]) => tally.m > 0)
    .sort((a, b) => b[1].m - a[1].m)
    .map(([key]) => key)
    .filter((key) => key !== " ")
    .slice(0, 5);
  const words = [
    ...new Set(result.training?.missedWords.map((item) => item.word) ?? []),
  ];
  if (!keys.length && !words.length && !result.keyStats[" "]?.m) return null;
  return {
    mode: "drill",
    id: "repair",
    name: "Fix my mistakes",
    source: "repair",
    keys,
    text: practiceText(keys, words),
  };
}

export function textId(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}-${(hash >>> 0).toString(36)}`;
}

export function trainingFor(
  config: TestConfig,
  text: string,
  stopOnError: boolean,
): Omit<Training, "pairStats" | "missedWords"> {
  return {
    source: config.source ?? "test",
    benchmark: {
      ...(config.mode === "time" || config.mode === "drill"
        ? { seconds: config.seconds }
        : {}),
      ...(config.mode === "words" ? { count: config.count } : {}),
      punctuation:
        "punctuation" in config
          ? config.punctuation
          : config.mode === "quote" || config.mode === "code",
      numbers: "numbers" in config ? config.numbers : config.mode === "code",
      stopOnError,
      ...(["quote", "code", "drill"].includes(config.mode)
        ? {
            textId: textId(text),
            textLabel: text.length > 32 ? `${text.slice(0, 32)}...` : text,
          }
        : {}),
    },
    ...(config.mode === "drill" &&
    (config.source === undefined || config.source === "test")
      ? { drillId: config.id }
      : {}),
    daily: config.daily,
  };
}

export function benchmarkKey(result: TestResult): string | null {
  const training = result.training;
  if (!training) return null;
  const b = training.benchmark;
  return JSON.stringify([
    result.mode,
    training.source === "race" ? "race" : "solo",
    b.seconds ?? null,
    b.count ?? null,
    b.punctuation,
    b.numbers,
    b.stopOnError,
    training.drillId ?? null,
    b.textId ?? null,
  ]);
}

export function benchmarkLabel(result: TestResult): string {
  if (!result.training) return "Older tests, settings unknown";
  const { benchmark: b, source } = result.training;
  const mode =
    source === "race"
      ? "1v1"
      : {
          time: "Timed",
          words: "Words",
          quote: "Prose",
          code: "Code",
          drill: result.label,
        }[result.mode];
  return [
    mode,
    b.seconds ? `${b.seconds}s` : b.count ? `${b.count} words` : null,
    b.punctuation ? "punctuation" : null,
    b.numbers ? "numbers" : null,
    b.stopOnError ? "stop on error" : null,
    b.textId ? (b.textLabel ? `"${b.textLabel}"` : "saved text") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function comparableResults(
  result: TestResult,
  results: TestResult[],
): TestResult[] {
  const key = benchmarkKey(result);
  return key === null
    ? []
    : results.filter((item) => benchmarkKey(item) === key);
}

export const DAILY_STEPS = [
  "Warm up",
  "Focus on weak keys",
  "Practise tricky pairs",
  "Mix it together",
  "Check your progress",
];

export function dailyStatus(results: TestResult[], now = Date.now()) {
  const day = dayKey(now);
  const completed = new Set(
    results
      .filter(
        (r) =>
          r.training?.source === "daily" &&
          r.training.daily?.day === day &&
          r.elapsedMs >= 60000 &&
          r.keystrokes >= 10,
      )
      .map((r) => r.training!.daily!.step),
  );
  let nextStep = 1;
  while (completed.has(nextStep)) nextStep++;
  return { day, completed: nextStep - 1, nextStep, done: nextStep > 5 };
}

export function dailyConfig(
  results: TestResult[],
  step: number,
  day: string,
): TestConfig {
  if (step === 1 || step === 5)
    return {
      mode: "time",
      seconds: 60,
      punctuation: false,
      numbers: false,
      source: "daily",
      daily: { day, step },
    };
  const targets = practiceTargets(results, 30);
  const selected = targets
    .filter((t) =>
      step === 2 ? t.kind === "key" : step === 3 ? t.kind === "pair" : true,
    )
    .slice(0, 5);
  const keys = selected.map((t) => t.token);
  const words =
    step === 4
      ? results
          .slice(0, 5)
          .flatMap((r) => r.training?.missedWords.map((m) => m.word) ?? [])
          .slice(0, 15)
      : [];
  const text =
    keys.length || words.length
      ? practiceText(keys, words, 1000)
      : generateTimedText({ punctuation: false, numbers: false });
  return {
    mode: "drill",
    id: `daily-${step}`,
    name: DAILY_STEPS[step - 1],
    text: text.length < 4000 ? `${text} ${text} ${text}` : text,
    seconds: 60,
    keys,
    source: "daily",
    daily: { day, step },
  };
}
