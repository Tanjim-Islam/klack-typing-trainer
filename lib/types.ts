import { z } from "zod";

export const TEST_MODES = ["time", "words", "quote", "code", "drill"] as const;
export type TestMode = (typeof TEST_MODES)[number];

export const MODE_LABELS: Record<TestMode, string> = {
  time: "Timed",
  words: "Words",
  quote: "Prose",
  code: "Code",
  drill: "Drill",
};

export const MODE_HINTS: Record<TestMode, string> = {
  time: "Type as many words as you can before the clock runs out.",
  words: "Race through a fixed number of words.",
  quote: "Full sentences with capitals and punctuation.",
  code: "Brackets, operators and symbols from real code.",
  drill: "Focused practice on a saved or generated drill.",
};

export const DURATIONS = [15, 30, 60, 120] as const;
export const WORD_COUNTS = [10, 25, 50, 100] as const;

export const ACCENTS = ["teal", "amber", "cobalt"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Descriptive names, used where there is room for them. */
export const ACCENT_LABELS: Record<Accent, string> = {
  teal: "Workshop teal",
  amber: "Signal amber",
  cobalt: "Blueprint cobalt",
};

/** Single-word names for tight controls. */
export const ACCENT_SHORT: Record<Accent, string> = {
  teal: "Teal",
  amber: "Amber",
  cobalt: "Cobalt",
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  accent: z.enum(ACCENTS).default("teal"),
  motion: z.enum(["system", "reduced"]).default("system"),
  defaultMode: z.enum(TEST_MODES).default("time"),
  duration: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]).default(30),
  wordCount: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .default(25),
  punctuation: z.boolean().default(false),
  numbers: z.boolean().default(false),
  stopOnError: z.boolean().default(false),
  showLiveStats: z.boolean().default(true),
  caret: z.enum(["block", "line", "underline"]).default("block"),
  textSize: z.enum(["md", "lg"]).default("md"),
  sound: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

/** Per-character tally: `h` correct hits, `m` misses. Kept terse, one entry
 *  per character typed, stored for every test ever taken. */
export const keyTallySchema = z.object({
  h: z.number().int().min(0),
  m: z.number().int().min(0),
});

export const resultSchema = z.object({
  id: z.string().min(1),
  at: z.number().int().positive(),
  mode: z.enum(TEST_MODES),
  /** Human label for the exact test taken, e.g. `30s`, `25 words`, drill name. */
  label: z.string().min(1).max(80),
  elapsedMs: z.number().min(0),
  wpm: z.number().min(0),
  rawWpm: z.number().min(0),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  correctChars: z.number().int().min(0),
  incorrectChars: z.number().int().min(0),
  keystrokes: z.number().int().min(0),
  correctKeystrokes: z.number().int().min(0),
  words: z.number().int().min(0),
  keyStats: z.record(z.string(), keyTallySchema),
  /** WPM sampled once per second, for the results sparkline. */
  samples: z.array(z.number().min(0)).max(600),
});

export type TestResult = z.infer<typeof resultSchema>;

/* -------------------------------------------------------------------------- */
/* Drills                                                                     */
/* -------------------------------------------------------------------------- */

export const DRILL_NAME_MAX = 48;
export const DRILL_TEXT_MIN = 20;
export const DRILL_TEXT_MAX = 2000;

export const drillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(DRILL_NAME_MAX),
  description: z.string().max(160).default(""),
  text: z.string().min(DRILL_TEXT_MIN).max(DRILL_TEXT_MAX),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  /** Seeded drills ship with the app and cannot be edited or deleted. */
  builtIn: z.boolean().default(false),
});

export type Drill = z.infer<typeof drillSchema>;

/** Shape of the create/edit drill form, validated before it becomes a Drill. */
export const drillFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the drill a name.")
    .max(DRILL_NAME_MAX, `Keep the name under ${DRILL_NAME_MAX} characters.`),
  description: z
    .string()
    .trim()
    .max(160, "Keep the note under 160 characters.")
    .default(""),
  text: z
    .string()
    .trim()
    .min(DRILL_TEXT_MIN, `Needs at least ${DRILL_TEXT_MIN} characters to practise on.`)
    .max(DRILL_TEXT_MAX, `Keep the text under ${DRILL_TEXT_MAX} characters.`)
    // The typing surface lays text out as one flowing paragraph, so newlines
    // and runs of whitespace are folded into single spaces.
    .transform((text) => text.replace(/\s+/g, " ")),
});

export type DrillFormValues = z.input<typeof drillFormSchema>;

/* -------------------------------------------------------------------------- */
/* Persisted document                                                        */
/* -------------------------------------------------------------------------- */

export const STORE_VERSION = 1;

export const storeSchema = z.object({
  version: z.literal(STORE_VERSION),
  settings: settingsSchema,
  results: z.array(resultSchema).max(2000),
  drills: z.array(drillSchema).max(200),
  onboarded: z.boolean().default(false),
});

export type StoreData = z.infer<typeof storeSchema>;
