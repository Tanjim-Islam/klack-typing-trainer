import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { toAccount, type Account } from "./account";

/**
 * The signed-in account as a Server Component can see it.
 *
 * Read in the root layout so the nav renders the right thing in the server HTML
 * instead of flashing "Sign in" at someone who is already signed in. The name
 * and picture come from the verified identity rather than the `profiles` table
 * on purpose: the session already carries them, so this costs one auth
 * verification and no database query per page.
 */
export async function currentAccount(): Promise<Account | null> {
  if (!supabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? toAccount(user) : null;
}
