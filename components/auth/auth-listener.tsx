"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { toAccount } from "@/lib/auth/account";
import { enterAccount, leaveAccount } from "@/lib/store";

/**
 * The bridge between Supabase's auth client and the app's store. Renders
 * nothing; mounted once in the root layout.
 *
 * The store is a plain module, not a React context, so this is the one place
 * that turns "a session appeared" into "load that account's document".
 */
export function AuthListener({ initialUserId = null }: { initialUserId?: string | null }) {
  const router = useRouter();
  /** What the server rendered against. Compared to decide whether the server
   *  tree is now stale — after a sign-in in another tab, for instance. */
  const renderedFor = useRef<string | null>(initialUserId);

  useEffect(() => {
    if (!supabaseConfigured) {
      leaveAccount();
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase holds a lock while this callback runs, and awaiting the auth
      // client inside it deadlocks. `enterAccount` queries the database, so
      // defer the whole thing off this tick.
      setTimeout(() => {
        const user = session?.user ?? null;

        if (user) {
          void enterAccount(toAccount(user));
        } else {
          leaveAccount();
        }

        // Server Components read the session too. Refresh only when it has
        // actually changed since the server rendered — sign-in and token
        // refresh events both fire on ordinary page loads, and refreshing on
        // each of those would be pure waste.
        const id = user?.id ?? null;
        if (id !== renderedFor.current) {
          renderedFor.current = id;
          router.refresh();
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
