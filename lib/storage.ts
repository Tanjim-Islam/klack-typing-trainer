import { BUILT_IN_DRILLS } from "./content";
import {
  DEFAULT_SETTINGS,
  STORE_VERSION,
  storeSchema,
  type Drill,
  type StoreData,
} from "./types";

export const STORAGE_KEY = "klack.v1";
const QUARANTINE_KEY = "klack.v1.unreadable";

/** Keeping the newest 500 tests is plenty of history and keeps writes fast. */
export const MAX_RESULTS = 500;
/** One sample per second; a 120s test needs 120. Trim anything longer. */
export const MAX_SAMPLES = 140;

function seedDrills(): Drill[] {
  const now = Date.now();
  return BUILT_IN_DRILLS.map((d) => ({
    ...d,
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  }));
}

export function defaultStore(): StoreData {
  return {
    version: STORE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    results: [],
    drills: seedDrills(),
    onboarded: false,
  };
}

/**
 * Built-in drills live in code, not in storage, so they can be added or
 * corrected in a later release without a migration. Any that are missing from
 * a saved document get grafted back on at load time.
 */
function withBuiltIns(drills: Drill[]): Drill[] {
  const seeded = seedDrills();
  const existing = new Set(drills.filter((d) => d.builtIn).map((d) => d.id));
  const missing = seeded.filter((d) => !existing.has(d.id));
  return [...drills, ...missing];
}

export type LoadStatus = "empty" | "loaded" | "recovered";

export interface LoadOutcome {
  data: StoreData;
  status: LoadStatus;
}

/**
 * Reads the saved document. Anything unparseable is moved aside rather than
 * thrown away, so a bad write never costs someone their history silently.
 */
export function loadStore(): LoadOutcome {
  if (typeof window === "undefined") return { data: defaultStore(), status: "empty" };

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing modes can throw on access; fall back to memory only.
    return { data: defaultStore(), status: "empty" };
  }

  if (!raw) return { data: defaultStore(), status: "empty" };

  try {
    const parsed = storeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error("schema mismatch");
    return {
      data: { ...parsed.data, drills: withBuiltIns(parsed.data.drills) },
      status: "loaded",
    };
  } catch {
    try {
      window.localStorage.setItem(QUARANTINE_KEY, raw);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing more we can do */
    }
    return { data: defaultStore(), status: "recovered" };
  }
}

export function trimForStorage(data: StoreData): StoreData {
  const results = [...data.results]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RESULTS)
    .map((r) =>
      r.samples.length > MAX_SAMPLES ? { ...r, samples: r.samples.slice(0, MAX_SAMPLES) } : r,
    );
  return { ...data, results };
}

export function saveStore(data: StoreData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimForStorage(data)));
    return true;
  } catch {
    return false;
  }
}

export function clearStore() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Export / import                                                            */
/* -------------------------------------------------------------------------- */

export function exportStore(data: StoreData): string {
  return JSON.stringify(trimForStorage(data), null, 2);
}

export type ImportOutcome =
  | { ok: true; data: StoreData }
  | { ok: false; error: string };

export function importStore(text: string): ImportOutcome {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const parsed = storeSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: "That file isn't a Klack backup, or it was saved by a newer version.",
    };
  }

  return {
    ok: true,
    data: { ...parsed.data, drills: withBuiltIns(parsed.data.drills) },
  };
}

export function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
