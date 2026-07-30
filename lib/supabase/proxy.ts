import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseEnv } from "./env";
import type { Database } from "./database.types";

/** Signed-in visitors have no business on these; send them to the app instead. */
const AUTH_ONLY_FOR_GUESTS = ["/login", "/signup"];

/**
 * Runs on every request that matches the matcher in `proxy.ts`.
 *
 * Two jobs, in this order:
 *
 * 1. Refresh the session. Supabase access tokens are short-lived, and only a
 *    server round trip can rotate them and write the new pair back as cookies.
 *    Without this, a returning visitor's session would look expired until
 *    something in the browser happened to refresh it.
 * 2. Keep signed-in visitors off the sign-in pages.
 *
 * Deliberately not an authorisation gate. Klack is fully usable without an
 * account, and the Next.js docs are explicit that Proxy is for optimistic
 * checks only. The real boundary is row level security in Postgres, which
 * cannot be bypassed by reaching a route directly.
 */
export async function updateSession(request: NextRequest) {
  // Without configuration there is no session to refresh; let the request
  // through so the app can render its own "not configured" message.
  if (!supabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response so the rotated cookies reach both the browser
        // and whatever renders downstream in this same request.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // This call is what performs the refresh. Nothing else in the file needs it,
  // so do not "optimise" it away.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && AUTH_ONLY_FOR_GUESTS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
