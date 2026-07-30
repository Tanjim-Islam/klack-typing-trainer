"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath, siteOrigin } from "@/lib/site-url";
import {
  firstFieldErrors,
  signInSchema,
  signUpSchema,
  type AuthFormState,
} from "@/lib/auth/schema";

/**
 * Every credential path in the app. All of it runs on the server, so a password
 * only ever exists in a request body and never in client-side state.
 */

/** Supabase error strings are aimed at developers. These are aimed at people. */
function readableAuthError(message: string, fallback: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email address first. Check your inbox for the link.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "There is already an account with that email. Sign in instead.";
  }
  if (m.includes("password") && m.includes("should be at least")) {
    return message; // Supabase states the project's own minimum; pass it through.
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "New accounts are not being accepted right now.";
  }
  return fallback;
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const echo = { values: { email: raw.email } };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...echo, fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ...echo,
      error: readableAuthError(error.message, "Could not sign you in. Try again."),
    };
  }

  // The nav and every Server Component read the session, so the whole tree is
  // stale until this runs.
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  };
  const echo = { values: { email: raw.email, displayName: raw.displayName } };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...echo, fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  const next = safeNextPath(formData.get("next") as string | null);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the trigger on auth.users, which writes it to profiles.
      data: parsed.data.displayName ? { display_name: parsed.data.displayName } : undefined,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      ...echo,
      error: readableAuthError(error.message, "Could not create your account. Try again."),
    };
  }

  // With email confirmation on, signUp returns a user but no session. Supabase
  // returns the same shape for an email that already exists, on purpose: it
  // refuses to reveal which addresses are registered. So the message has to
  // work for both readings without claiming an account was created.
  if (!data.session) {
    return {
      notice:
        `Check ${parsed.data.email} for a confirmation link. ` +
        "Open it and you will be signed in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/**
 * Continue with Google.
 *
 * A Server Action rather than a click handler so it works before JavaScript
 * loads, and so the PKCE code verifier is written as an httpOnly cookie that
 * page scripts cannot read. `signInWithOAuth` on the server does not redirect
 * by itself; it hands back the URL to send the browser to.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  const next = safeNextPath(formData.get("next") as string | null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        // Ask Google every time rather than silently reusing whichever account
        // the browser happens to be signed into.
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    const message = error
      ? readableAuthError(error.message, "Google sign-in is unavailable right now.")
      : "Google sign-in is unavailable right now.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // `local` revokes this browser's session only. A shared or work machine
  // signing out should not knock the same account off a phone.
  // A failed revoke still clears the cookies, so the redirect happens either
  // way rather than stranding someone on a broken page.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  revalidatePath("/", "layout");
  redirect("/login?signedout=1");
}
