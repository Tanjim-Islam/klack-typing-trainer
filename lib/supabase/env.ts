/**
 * Reading the two environment variables Supabase needs, in one place.
 *
 * Both are `NEXT_PUBLIC_`, so they are inlined at build time and readable in
 * the browser. That is by design: the publishable key identifies the project,
 * it does not authorise anything. Row level security decides what a request
 * can see, and every table in this project is private to its owner.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * True when the project is configured. Checked rather than assumed so a missing
 * `.env.local` produces a readable message on the sign-in page instead of an
 * opaque crash somewhere inside the client.
 */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function supabaseEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example).",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}
