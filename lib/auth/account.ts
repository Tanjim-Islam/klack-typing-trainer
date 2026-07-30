import type { User } from "@supabase/supabase-js";

/**
 * The bit of a Supabase user the interface actually shows.
 *
 * Its own module because both sides need it: the root layout reads it on the
 * server so the nav is right in the first HTML, and the auth listener reads it
 * in the browser on every session change.
 */
export interface Account {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The name and picture arrive under different keys depending on the route in:
 * our own sign-up form writes `display_name`, Google's claims arrive as
 * `full_name` / `name` and `avatar_url` / `picture`.
 */
export function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: text(meta.display_name) ?? text(meta.full_name) ?? text(meta.name),
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  };
}
