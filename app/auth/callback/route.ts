import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";

/**
 * Where every link back into the app lands: the Google redirect, and the link in
 * a sign-up confirmation email.
 *
 * Two shapes arrive here, so both are handled:
 *
 *   ?code=…                  PKCE. Google always, and email links when the
 *                            project is on the PKCE flow. Exchanged for a
 *                            session using the verifier cookie set at sign-in.
 *   ?token_hash=…&type=…     The email template variant. Verified directly, and
 *                            works even if the verifier cookie is gone (a link
 *                            opened in a different browser, say).
 *
 * A Route Handler rather than a page because this has to write session cookies,
 * which rendering cannot do.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Supabase reports a refused or abandoned consent screen in the query string.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(origin, providerError);

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(origin, error.message);
    return NextResponse.redirect(new URL(next, origin));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(origin, error.message);
    return NextResponse.redirect(new URL(next, origin));
  }

  return fail(origin, "That sign-in link is incomplete. Start again.");
}

/**
 * Failures go back to the sign-in page with something readable, never to an
 * error screen: a link that has already been used or has expired is a normal
 * thing to happen, not a fault.
 */
function fail(origin: string, message: string) {
  const url = new URL("/login", origin);
  url.searchParams.set(
    "error",
    /expired|invalid/i.test(message)
      ? "That link has expired or was already used. Sign in, or request a new one."
      : message,
  );
  return NextResponse.redirect(url);
}
