import { z } from "zod";
import { generateLiteraryPassage, generateWordText } from "./content";
import { createId } from "./format";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STORAGE_PREFIX = "klack.race.v1";

export const RACE_DURATIONS = [30, 60, 120] as const;
export const RACE_NAME_MAX = 24;

export const raceCodeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{8}$/);
export const raceContentSchema = z.enum(["words", "literature"]);

export type RaceContent = z.infer<typeof raceContentSchema>;

export const raceIdentitySchema = z.object({
  playerId: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(RACE_NAME_MAX),
  role: z.enum(["host", "guest"]),
});

export type RaceIdentity = z.infer<typeof raceIdentitySchema>;

export const raceConfigSchema = z.object({
  version: z.literal(1),
  code: raceCodeSchema,
  hostId: z.string().min(1).max(80),
  duration: z.union([z.literal(30), z.literal(60), z.literal(120)]),
  content: raceContentSchema,
  text: z.string().min(20).max(10000),
  source: z.string().min(1).max(160).optional(),
  createdAt: z.number().int().positive(),
});

export type RaceConfig = z.infer<typeof raceConfigSchema>;

export const racePresenceSchema = z.object({
  playerId: z.string().min(1).max(80),
  name: z.string().min(1).max(RACE_NAME_MAX),
  role: z.enum(["host", "guest"]),
  joinedAt: z.number().int().positive(),
  ready: z.boolean(),
  status: z.enum(["lobby", "racing", "finished"]),
});

export type RacePresence = z.infer<typeof racePresenceSchema>;

export const raceStartSchema = z.object({
  version: z.literal(1),
  raceId: z.string().min(1).max(80),
  countdownMs: z.number().int().min(2000).max(10000),
  config: raceConfigSchema,
});

export type RaceStart = z.infer<typeof raceStartSchema>;

export const raceProgressSchema = z.object({
  version: z.literal(1),
  raceId: z.string().min(1).max(80),
  playerId: z.string().min(1).max(80),
  cursor: z.number().int().min(0),
  progress: z.number().min(0).max(1),
  wpm: z.number().min(0).max(400),
  accuracy: z.number().min(0).max(100),
});

export type RaceProgress = z.infer<typeof raceProgressSchema>;

export const raceFinishSchema = z.object({
  version: z.literal(1),
  raceId: z.string().min(1).max(80),
  playerId: z.string().min(1).max(80),
  wpm: z.number().min(0).max(400),
  accuracy: z.number().min(0).max(100),
  correctChars: z.number().int().min(0),
  progress: z.number().min(0).max(1),
});

export type RaceFinish = z.infer<typeof raceFinishSchema>;

export function normalizeRaceCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function displayRaceCode(code: string): string {
  const normalized = normalizeRaceCode(code);
  return normalized.length > 4
    ? `${normalized.slice(0, 4)} ${normalized.slice(4)}`
    : normalized;
}

export function createRaceCode(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

export function createRaceIdentity(name: string, role: RaceIdentity["role"]): RaceIdentity {
  const parsedName = name.trim().slice(0, RACE_NAME_MAX) || "Guest typist";
  return raceIdentitySchema.parse({
    playerId: createId(),
    name: parsedName,
    role,
  });
}

export function createRaceConfig({
  code,
  hostId,
  duration,
  content,
}: {
  code: string;
  hostId: string;
  duration: (typeof RACE_DURATIONS)[number];
  content: RaceContent;
}): RaceConfig {
  if (content === "literature") {
    const passage = generateLiteraryPassage(520);
    return raceConfigSchema.parse({
      version: 1,
      code,
      hostId,
      duration,
      content,
      text: passage.text,
      source: passage.source,
      createdAt: Date.now(),
    });
  }

  return raceConfigSchema.parse({
    version: 1,
    code,
    hostId,
    duration,
    content,
    text: generateWordText({ count: 520, punctuation: false, numbers: false }),
    source: "Common word race",
    createdAt: Date.now(),
  });
}

function identityKey(code: string): string {
  return `${STORAGE_PREFIX}.identity.${code}`;
}

function configKey(code: string): string {
  return `${STORAGE_PREFIX}.config.${code}`;
}

export function saveRaceSetup(identity: RaceIdentity, config?: RaceConfig) {
  if (typeof window === "undefined") return;
  if (!config) return;
  try {
    window.sessionStorage.setItem(identityKey(config.code), JSON.stringify(identity));
    window.sessionStorage.setItem(configKey(config.code), JSON.stringify(config));
  } catch {
    // The room can still work when browser storage is unavailable.
  }
}

export function saveRaceIdentity(code: string, identity: RaceIdentity) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(identityKey(code), JSON.stringify(identity));
  } catch {
    // The room can still work when browser storage is unavailable.
  }
}

export function loadRaceIdentity(code: string): RaceIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(identityKey(code));
    if (!raw) return null;
    const parsed = raceIdentitySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function loadRaceConfig(code: string): RaceConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(configKey(code));
    if (!raw) return null;
    const parsed = raceConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.code === code ? parsed.data : null;
  } catch {
    return null;
  }
}
