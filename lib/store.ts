"use client";

import { useSyncExternalStore } from "react";
import { createId } from "./format";
import {
  defaultStore,
  exportStore,
  importStore,
  loadStore,
  saveStore,
  type LoadStatus,
} from "./storage";
import {
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
 * Persistence is browser-local: there is no account and no server, so the data
 * lives and dies with this browser profile, with export/import as the escape
 * hatch.
 */

export interface QueuedDrill {
  name: string;
  text: string;
  /** Present when the drill was generated from weak-key analysis. */
  keys?: string[];
}

export interface StoreSnapshot {
  ready: boolean;
  status: LoadStatus;
  settings: Settings;
  results: TestResult[];
  drills: Drill[];
  onboarded: boolean;
  queuedDrill: QueuedDrill | null;
}

let data: StoreData = defaultStore();
let status: LoadStatus = "empty";
let ready = false;
let queuedDrill: QueuedDrill | null = null;
let loadAttempted = false;

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
  const outcome = loadStore();
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
  saveStore(data);
  emit();
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...data, settings: { ...data.settings, ...patch } });
}

export function addResult(result: TestResult) {
  commit({ ...data, results: [result, ...data.results] });
}

export function deleteResult(id: string) {
  commit({ ...data, results: data.results.filter((r) => r.id !== id) });
}

export function clearResults() {
  commit({ ...data, results: [] });
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
  return drill;
}

export function editDrill(id: string, values: DrillFormValues) {
  const parsed = drillFormSchema.safeParse(values);
  if (!parsed.success) return;

  commit({
    ...data,
    drills: data.drills.map((d) =>
      d.id === id && !d.builtIn ? { ...d, ...parsed.data, updatedAt: Date.now() } : d,
    ),
  });
}

export function deleteDrill(id: string) {
  commit({
    ...data,
    // Built-in drills are part of the app, not the document, so they stay.
    drills: data.drills.filter((d) => d.id !== id || d.builtIn),
  });
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
}

export function exportAll(): string {
  return exportStore(data);
}

export function replaceAll(json: string): { ok: true } | { ok: false; error: string } {
  const outcome = importStore(json);
  if (!outcome.ok) return { ok: false, error: outcome.error };
  commit(outcome.data);
  return { ok: true };
}

export function resetAll() {
  queuedDrill = null;
  commit(defaultStore());
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useStore(): StoreSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}
