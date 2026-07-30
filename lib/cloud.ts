import type { SupabaseClient } from "./supabase/client";
import { MAX_RESULTS } from "./storage";
import {
  DEFAULT_SETTINGS,
  drillSchema,
  resultSchema,
  settingsSchema,
  type Drill,
  type Settings,
  type TestResult,
} from "./types";

/**
 * The translation layer between the app's document shape and the five tables in
 * `supabase/migrations/0001_init.sql`.
 *
 * Everything read back from the database goes through the same zod schemas that
 * guard local storage. The column CHECK constraints make bad rows unlikely, but
 * "unlikely" is not a reason to let unvalidated data into the store.
 */

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

/** Settings columns are snake_case; the document is camelCase. */
const SETTINGS_COLUMNS = {
  theme: "theme",
  accent: "accent",
  motion: "motion",
  defaultMode: "default_mode",
  duration: "duration",
  wordCount: "word_count",
  punctuation: "punctuation",
  numbers: "numbers",
  stopOnError: "stop_on_error",
  showLiveStats: "show_live_stats",
  caret: "caret",
  textSize: "text_size",
  sound: "sound",
} as const satisfies Record<keyof Settings, string>;

type SettingsRow = Record<string, unknown>;

function settingsFromRow(row: SettingsRow | null): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  const candidate: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
    candidate[key] = row[column];
  }
  // Any column the schema rejects falls back to its default rather than
  // failing the whole sign-in.
  const parsed = settingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
}

function settingsToRow(patch: Partial<Settings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
    const value = patch[key as keyof Settings];
    if (value !== undefined) row[column] = value;
  }
  return row;
}

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

interface ResultRowWithKeys {
  client_id: string;
  taken_at: string;
  mode: string;
  label: string;
  elapsed_ms: number;
  wpm: number | string;
  raw_wpm: number | string;
  accuracy: number | string;
  consistency: number | string;
  correct_chars: number;
  incorrect_chars: number;
  keystrokes: number;
  correct_keystrokes: number;
  words: number;
  samples: number[] | null;
  result_key_stats: { char: string; hits: number; misses: number }[] | null;
}

function resultFromRow(row: ResultRowWithKeys): TestResult | null {
  const keyStats: Record<string, { h: number; m: number }> = {};
  for (const k of row.result_key_stats ?? []) {
    keyStats[k.char] = { h: k.hits, m: k.misses };
  }

  const parsed = resultSchema.safeParse({
    id: row.client_id,
    at: new Date(row.taken_at).getTime(),
    mode: row.mode,
    label: row.label,
    elapsedMs: row.elapsed_ms,
    // numeric columns can arrive as strings depending on the driver.
    wpm: Number(row.wpm),
    rawWpm: Number(row.raw_wpm),
    accuracy: Number(row.accuracy),
    consistency: Number(row.consistency),
    correctChars: row.correct_chars,
    incorrectChars: row.incorrect_chars,
    keystrokes: row.keystrokes,
    correctKeystrokes: row.correct_keystrokes,
    words: row.words,
    keyStats,
    samples: (row.samples ?? []).map(Number),
  });

  // A single unreadable row is dropped, not fatal: losing one test from a
  // history view is better than showing none of it.
  return parsed.success ? parsed.data : null;
}

/** The payload `save_test_results` expects: the document shape, verbatim. */
function resultToPayload(result: TestResult) {
  return {
    id: result.id,
    at: result.at,
    mode: result.mode,
    label: result.label,
    elapsedMs: Math.round(result.elapsedMs),
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    correctChars: result.correctChars,
    incorrectChars: result.incorrectChars,
    keystrokes: result.keystrokes,
    correctKeystrokes: result.correctKeystrokes,
    words: result.words,
    keyStats: result.keyStats,
    samples: result.samples,
  };
}

/* -------------------------------------------------------------------------- */
/* Drills                                                                     */
/* -------------------------------------------------------------------------- */

interface DrillRow {
  client_id: string;
  name: string;
  description: string;
  text: string;
  created_at: string;
  updated_at: string;
}

function drillFromRow(row: DrillRow): Drill | null {
  const parsed = drillSchema.safeParse({
    id: row.client_id,
    name: row.name,
    description: row.description,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    builtIn: false,
  });
  return parsed.success ? parsed.data : null;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export interface AccountData {
  settings: Settings;
  results: TestResult[];
  /** Custom drills only. Built-ins are grafted on by the storage layer. */
  drills: Drill[];
  onboarded: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Loads the whole account in three requests.
 *
 * Results embed their key stats rather than being fetched separately, both to
 * save a round trip and because PostgREST's row cap applies to the top-level
 * rows only — a second query for ~20,000 key-stat rows could be truncated
 * silently, and silently wrong history is worse than slow history.
 */
export async function fetchAccountData(supabase: SupabaseClient): Promise<AccountData> {
  const [profile, settings, results, drills] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, onboarded").maybeSingle(),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase
      .from("test_results")
      .select(
        "client_id, taken_at, mode, label, elapsed_ms, wpm, raw_wpm, accuracy, " +
          "consistency, correct_chars, incorrect_chars, keystrokes, " +
          "correct_keystrokes, words, samples, result_key_stats(char, hits, misses)",
      )
      .order("taken_at", { ascending: false })
      .limit(MAX_RESULTS),
    supabase
      .from("drills")
      .select("client_id, name, description, text, created_at, updated_at")
      .order("created_at", { ascending: true }),
  ]);

  const firstError = profile.error ?? settings.error ?? results.error ?? drills.error;
  if (firstError) throw new Error(firstError.message);

  return {
    settings: settingsFromRow(settings.data),
    results: ((results.data ?? []) as unknown as ResultRowWithKeys[])
      .map(resultFromRow)
      .filter((r): r is TestResult => r !== null),
    drills: ((drills.data ?? []) as DrillRow[])
      .map(drillFromRow)
      .filter((d): d is Drill => d !== null),
    onboarded: profile.data?.onboarded ?? false,
    displayName: profile.data?.display_name ?? null,
    avatarUrl: profile.data?.avatar_url ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/** Chunked so a large first-time upload cannot exceed the request body limit. */
const UPLOAD_CHUNK = 50;

export async function pushResults(supabase: SupabaseClient, results: TestResult[]) {
  for (let i = 0; i < results.length; i += UPLOAD_CHUNK) {
    const chunk = results.slice(i, i + UPLOAD_CHUNK).map(resultToPayload);
    const { error } = await supabase.rpc("save_test_results", { p_results: chunk });
    if (error) throw new Error(error.message);
  }
}

export async function deleteResult(supabase: SupabaseClient, clientId: string) {
  // The key stats go with it: result_key_stats cascades on result_id.
  const { error } = await supabase.from("test_results").delete().eq("client_id", clientId);
  if (error) throw new Error(error.message);
}

export async function deleteResults(supabase: SupabaseClient, clientIds: string[]) {
  if (clientIds.length === 0) return;
  const { error } = await supabase.from("test_results").delete().in("client_id", clientIds);
  if (error) throw new Error(error.message);
}

/** Row level security scopes this to the caller, so no user filter is needed. */
export async function clearResults(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("test_results").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function pushSettings(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Settings>,
) {
  const row = settingsToRow(patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function pushDrills(
  supabase: SupabaseClient,
  userId: string,
  drills: Drill[],
) {
  const custom = drills.filter((d) => !d.builtIn);
  if (custom.length === 0) return;
  const { error } = await supabase.from("drills").upsert(
    custom.map((d) => ({
      user_id: userId,
      client_id: d.id,
      name: d.name,
      description: d.description,
      text: d.text,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt).toISOString(),
    })),
    { onConflict: "user_id,client_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteDrill(supabase: SupabaseClient, clientId: string) {
  const { error } = await supabase.from("drills").delete().eq("client_id", clientId);
  if (error) throw new Error(error.message);
}

export async function setOnboarded(
  supabase: SupabaseClient,
  userId: string,
  onboarded: boolean,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Used by "Reset everything" while signed in: wipe the account clean. */
export async function resetAccount(supabase: SupabaseClient, userId: string) {
  const results = await supabase.from("test_results").delete().eq("user_id", userId);
  if (results.error) throw new Error(results.error.message);

  const drills = await supabase.from("drills").delete().eq("user_id", userId);
  if (drills.error) throw new Error(drills.error.message);

  await pushSettings(supabase, userId, DEFAULT_SETTINGS);
  await setOnboarded(supabase, userId, false);
}
