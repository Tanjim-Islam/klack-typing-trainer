"use client";

import { useSyncExternalStore } from "react";
import { createId } from "./format";
import {
  defaultStore,
  exportStore,
  hasMergedGuestData,
  importStore,
  loadStore,
  markGuestDataMerged,
  saveStore,
  type LoadStatus,
} from "./storage";
import * as cloud from "./cloud";
import type { Account } from "./auth/account";
import { createSupabaseBrowserClient, type SupabaseClient } from "./supabase/client";
import { supabaseConfigured } from "./supabase/env";
import {
  DEFAULT_SETTINGS,
  DRILL_NAME_MAX,
  drillFormSchema,
  type Drill,
  type DrillFormValues,
  type Settings,
  type StoreData,
  type TestResult,
} from "./types";

/**
 * Single source of truth for everything the app remembers.
 *
 * This is a plain module-level store read through `useSyncExternalStore` rather
 * than React context. Local storage cannot be read while rendering on the
 * server, and this shape lets the first paint use defaults and swap in the saved
 * document the moment the first component subscribes, with no effect-driven
 * setState and no provider to thread through the tree.
 *
 * Persistence has two modes:
 *
 * - **Guest.** No account. The document lives in this browser's local storage
 *   under `klack.v1`, exactly as it always did.
 * - **Signed in.** Postgres is the source of truth. Local storage stays on as a
 *   per-account cache (`klack.v1.u.<id>`) so a returning visitor sees their
 *   history on first paint rather than after a round trip.
 *
 * Writes are local-first in both modes: the store updates and re-renders
 * immediately, then the matching database call goes out. That keeps typing
 * responsive — nobody should wait on a network request to see their score — and
 * a failed write surfaces as `syncError` rather than by silently reverting the
 * interface, with the local copy still holding the change.
 */

export interface QueuedDrill {
  name: string;
  text: string;
  /** Present when the drill was generated from weak-key analysis. */
  keys?: string[];
}

export type { Account };

/** Where the document currently lives, and whether it is in step. */
export type SyncState =
  /** No account: this browser only. */
  | "local"
  /** Signed in, first load in flight. */
  | "loading"
  /** Signed in, first-run upload of this browser's guest history in flight. */
  | "merging"
  /** Signed in and in step with the database. */
  | "synced"
  /** Signed in, but the last read or write failed. */
  | "error";

export interface StoreSnapshot {
  ready: boolean;
  status: LoadStatus;
  settings: Settings;
  results: TestResult[];
  drills: Drill[];
  onboarded: boolean;
  queuedDrill: QueuedDrill | null;
  account: Account | null;
  /**
   * False until the auth client has reported once. Components that show account
   * state fall back to what the server rendered while this is false, so a
   * signed-in visitor never sees "Sign in" flash in the nav.
   */
  authResolved: boolean;
  sync: SyncState;
  /** Set when a database call fails. Cleared by `dismissSyncError`. */
  syncError: string | null;
}

let data: StoreData = defaultStore();
let status: LoadStatus = "empty";
let ready = false;
let queuedDrill: QueuedDrill | null = null;
let loadAttempted = false;
let account: Account | null = null;
let authResolved = false;
let sync: SyncState = "local";
let syncError: string | null = null;

const listeners = new Set<() => void>();

function build(): StoreSnapshot {
  return {
    ready,
    status,
    settings: data.settings,
    results: data.results,
    drills: data.drills,
    onboarded: data.onboarded,
    queuedDrill,
    account,
    authResolved,
    sync,
    syncError,
  };
}

/** Cached so `getSnapshot` is referentially stable between changes. */
let snapshot: StoreSnapshot = build();

/** Frozen defaults for server rendering, identical on every request. */
const serverSnapshot: StoreSnapshot = build();

function emit() {
  snapshot = build();
  for (const listener of listeners) listener();
}

function loadOnce() {
  if (loadAttempted) return;
  loadAttempted = true;
  // Always the guest document first. If there is a session, the auth listener
  // calls `enterAccount` a moment later and swaps in that account's cache.
  const outcome = loadStore(null);
  data = outcome.data;
  status = outcome.status;
  ready = true;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The first subscriber triggers the read; later ones just join the broadcast.
  loadOnce();
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: StoreData) {
  data = next;
  saveStore(data, account?.id ?? null);
  emit();
}

/* -------------------------------------------------------------------------- */
/* Database plumbing                                                          */
/* -------------------------------------------------------------------------- */

let client: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createSupabaseBrowserClient();
  return client;
}

/**
 * Fires a write at the database without blocking the caller.
 *
 * Actions stay synchronous from the interface's point of view. A failure sets
 * `syncError`, which `<SyncNotices>` turns into a toast; it does not roll the
 * local change back, because the local copy is still an accurate record of what
 * the user did, and undoing it in front of them would be worse than a warning.
 */
function push(
  what: string,
  run: (supabase: SupabaseClient, userId: string) => Promise<void>,
) {
  const supabase = db();
  const userId = account?.id;
  if (!supabase || !userId) return;

  void run(supabase, userId).then(
    () => {
      // Do not stamp "synced" over a load that is still running, or over an
      // error raised by some other write in the meantime.
      if (sync === "loading" || sync === "merging" || syncError !== null) return;
      if (sync !== "synced") {
        sync = "synced";
        emit();
      }
    },
    (thrown: unknown) => {
      sync = "error";
      syncError = `${what} could not be saved to your account. ${
        thrown instanceof Error ? thrown.message : "Check your connection."
      }`;
      emit();
    },
  );
}

export function dismissSyncError() {
  if (syncError === null) return;
  syncError = null;
  if (sync === "error") sync = account ? "synced" : "local";
  emit();
}

/* -------------------------------------------------------------------------- */
/* Sign in and sign out                                                       */
/* -------------------------------------------------------------------------- */

/** Guards against an out-of-order load: only the newest one wins. */
let loadToken = 0;

/**
 * Called by `<AuthListener>` when a session appears, and again on every token
 * refresh. Idempotent by design: refreshes are frequent and must not re-fetch.
 */
export async function enterAccount(next: Account) {
  if (!authResolved) authResolved = true;

  if (account?.id === next.id) {
    // Same account, refreshed session. Keep any newer profile details.
    if (
      account.email !== next.email ||
      (next.displayName && account.displayName !== next.displayName) ||
      (next.avatarUrl && account.avatarUrl !== next.avatarUrl)
    ) {
      account = {
        id: account.id,
        email: next.email,
        displayName: next.displayName ?? account.displayName,
        avatarUrl: next.avatarUrl ?? account.avatarUrl,
      };
      emit();
    }
    return;
  }

  const token = ++loadToken;
  // Snapshot the guest document before the account's cache replaces it.
  const guest = account === null ? data : loadStore(null).data;

  account = next;
  sync = "loading";
  syncError = null;

  // Paint this account's cached document straight away, if there is one.
  const cached = loadStore(next.id);
  data = cached.data;
  status = cached.status;
  ready = true;
  emit();

  const supabase = db();
  if (!supabase) {
    sync = "error";
    syncError = "Accounts are not configured in this deployment.";
    emit();
    return;
  }

  try {
    let remote = await cloud.fetchAccountData(supabase);
    if (token !== loadToken) return;

    account = {
      id: next.id,
      email: next.email,
      displayName: remote.displayName ?? next.displayName,
      avatarUrl: remote.avatarUrl ?? next.avatarUrl,
    };

    // First sign-in on this browser: hand the guest history over rather than
    // stranding it behind an account.
    if (!hasMergedGuestData(next.id)) {
      remote = await mergeGuestInto(supabase, next.id, guest, remote);
      if (token !== loadToken) return;
      markGuestDataMerged(next.id);
    }

    const seeded = defaultStore();
    data = {
      ...seeded,
      settings: remote.settings,
      results: remote.results,
      // Built-in drills live in code, not in the database, so take them from
      // the freshly seeded document and append the account's own.
      drills: [...seeded.drills, ...remote.drills],
      onboarded: remote.onboarded,
    };
    status = "loaded";
    sync = "synced";
    saveStore(data, next.id);
    emit();
  } catch (thrown) {
    if (token !== loadToken) return;
    sync = "error";
    syncError = `Could not load your account. ${
      thrown instanceof Error ? thrown.message : "Check your connection."
    } Showing this browser's copy for now.`;
    emit();
  }
}

/**
 * Uploads whatever this browser accumulated before sign-in.
 *
 * Only what the account does not already have, matched on the client-generated
 * id, so signing in on a browser that is already in step uploads nothing.
 * Nothing is deleted: the guest document stays where it is, both as a fallback
 * and because someone may go on using the app signed out.
 */
async function mergeGuestInto(
  supabase: SupabaseClient,
  userId: string,
  guest: StoreData,
  remote: cloud.AccountData,
): Promise<cloud.AccountData> {
  const remoteResultIds = new Set(remote.results.map((r) => r.id));
  const newResults = guest.results.filter((r) => !remoteResultIds.has(r.id));

  const remoteDrillIds = new Set(remote.drills.map((d) => d.id));
  const newDrills = guest.drills.filter((d) => !d.builtIn && !remoteDrillIds.has(d.id));

  // A brand new account has nothing of its own to overwrite, so let this
  // browser's chosen settings carry over. An account with history keeps its
  // own: those were chosen later, and deliberately.
  const accountIsFresh = remote.results.length === 0 && remote.drills.length === 0;
  const adoptSettings = accountIsFresh && !settingsAreDefault(guest.settings);

  if (newResults.length === 0 && newDrills.length === 0 && !adoptSettings) {
    return remote;
  }

  sync = "merging";
  emit();

  if (newResults.length > 0) await cloud.pushResults(supabase, newResults);
  if (newDrills.length > 0) await cloud.pushDrills(supabase, userId, newDrills);
  if (adoptSettings) await cloud.pushSettings(supabase, userId, guest.settings);
  if (accountIsFresh && guest.onboarded) await cloud.setOnboarded(supabase, userId, true);

  return {
    ...remote,
    settings: adoptSettings ? guest.settings : remote.settings,
    results: [...remote.results, ...newResults].sort((a, b) => b.at - a.at),
    drills: [...remote.drills, ...newDrills],
    onboarded: remote.onboarded || (accountIsFresh && guest.onboarded),
  };
}

function settingsAreDefault(settings: Settings): boolean {
  return (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every(
    (key) => settings[key] === DEFAULT_SETTINGS[key],
  );
}

/** Called by `<AuthListener>` when the session goes away, or when there was
 *  never one to begin with. */
export function leaveAccount() {
  if (account === null) {
    if (!authResolved) {
      authResolved = true;
      emit();
    }
    return;
  }

  authResolved = true;
  loadToken++;
  account = null;
  sync = "local";
  syncError = null;
  queuedDrill = null;

  const outcome = loadStore(null);
  data = outcome.data;
  status = outcome.status;
  ready = true;
  emit();
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...data, settings: { ...data.settings, ...patch } });
  push("That setting", (supabase, userId) => cloud.pushSettings(supabase, userId, patch));
}

export function addResult(result: TestResult) {
  commit({ ...data, results: [result, ...data.results] });
  push("Your test", (supabase) => cloud.pushResults(supabase, [result]));
}

export function deleteResult(id: string) {
  commit({ ...data, results: data.results.filter((r) => r.id !== id) });
  push("That deletion", (supabase) => cloud.deleteResult(supabase, id));
}

export function clearResults() {
  commit({ ...data, results: [] });
  push("Clearing your history", (supabase, userId) =>
    cloud.clearResults(supabase, userId),
  );
}

export function createDrill(values: DrillFormValues): Drill | null {
  const parsed = drillFormSchema.safeParse(values);
  if (!parsed.success) return null;

  const now = Date.now();
  const drill: Drill = {
    id: createId(),
    name: parsed.data.name,
    description: parsed.data.description,
    text: parsed.data.text,
    createdAt: now,
    updatedAt: now,
    builtIn: false,
  };
  commit({ ...data, drills: [...data.drills, drill] });
  push("That drill", (supabase, userId) => cloud.pushDrills(supabase, userId, [drill]));
  return drill;
}

export function editDrill(id: string, values: DrillFormValues) {
  const parsed = drillFormSchema.safeParse(values);
  if (!parsed.success) return;

  const drills = data.drills.map((d) =>
    d.id === id && !d.builtIn ? { ...d, ...parsed.data, updatedAt: Date.now() } : d,
  );
  commit({ ...data, drills });

  const edited = drills.find((d) => d.id === id && !d.builtIn);
  if (edited) {
    push("That drill", (supabase, userId) => cloud.pushDrills(supabase, userId, [edited]));
  }
}

export function deleteDrill(id: string) {
  const target = data.drills.find((d) => d.id === id);
  // Built-in drills are part of the app, not the document, so they stay.
  if (!target || target.builtIn) return;

  commit({ ...data, drills: data.drills.filter((d) => d.id !== id) });
  push("That deletion", (supabase) => cloud.deleteDrill(supabase, id));
}

export function duplicateDrill(id: string): Drill | null {
  const source = data.drills.find((d) => d.id === id);
  if (!source) return null;

  const taken = new Set(data.drills.map((d) => d.name));
  let name = `${source.name} copy`.slice(0, DRILL_NAME_MAX);
  let n = 2;
  while (taken.has(name)) name = `${source.name} copy ${n++}`.slice(0, DRILL_NAME_MAX);

  const now = Date.now();
  const copy: Drill = {
    id: createId(),
    name,
    description: source.description,
    text: source.text,
    createdAt: now,
    updatedAt: now,
    builtIn: false,
  };
  commit({ ...data, drills: [...data.drills, copy] });
  push("That drill", (supabase, userId) => cloud.pushDrills(supabase, userId, [copy]));
  return copy;
}

/** Hands a drill to the Type page across a navigation. Not persisted. */
export function queueDrill(drill: QueuedDrill | null) {
  queuedDrill = drill;
  emit();
}

export function dismissOnboarding() {
  if (data.onboarded) return;
  commit({ ...data, onboarded: true });
  push("Your progress", (supabase, userId) => cloud.setOnboarded(supabase, userId, true));
}

export function exportAll(): string {
  return exportStore(data);
}

export function replaceAll(json: string): { ok: true } | { ok: false; error: string } {
  const outcome = importStore(json);
  if (!outcome.ok) return { ok: false, error: outcome.error };

  commit(outcome.data);

  // Importing replaces the document, so the account has to be brought to match:
  // clear what is there, then upload the imported history, drills and settings.
  const imported = outcome.data;
  push("The imported backup", async (supabase, userId) => {
    await cloud.resetAccount(supabase, userId);
    await cloud.pushResults(supabase, imported.results);
    await cloud.pushDrills(supabase, userId, imported.drills);
    await cloud.pushSettings(supabase, userId, imported.settings);
    if (imported.onboarded) await cloud.setOnboarded(supabase, userId, true);
  });

  return { ok: true };
}

export function resetAll() {
  queuedDrill = null;
  commit(defaultStore());
  push("The reset", (supabase, userId) => cloud.resetAccount(supabase, userId));
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useStore(): StoreSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}
