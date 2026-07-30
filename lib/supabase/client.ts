"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "./database.types";

export type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

/**
 * The browser client. `createBrowserClient` already returns the same instance
 * for a given url/key pair, so calling this from anywhere in the tree is cheap
 * and every caller shares one auth listener and one token refresh timer.
 */
export function createSupabaseBrowserClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient<Database>(url, key);
}
