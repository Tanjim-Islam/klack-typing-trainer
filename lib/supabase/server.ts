import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";
import type { Database } from "./database.types";

/**
 * The server client, for Server Components, Server Actions and Route Handlers.
 *
 * A fresh client per request is required, not optional: it closes over that
 * request's cookie store, and sharing one across requests would leak one
 * visitor's session into another's.
 */
export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Ignoring this is safe here
          // because proxy.ts refreshes the session on every request, so a
          // rotated token is never dropped.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 *
 * Always `getUser()` and never `getSession()` on the server: `getSession` reads
 * the cookie and trusts it, while `getUser` verifies the token with the auth
 * server. Cookies are client-controlled, so only the verified answer is safe to
 * make authorisation decisions with.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
