import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside, AuthShell, NotConfigured } from "@/components/auth/auth-shell";
import { safeNextPath } from "@/lib/site-url";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a Klack account to sync your typing history, weak keys and drills across devices.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (!supabaseConfigured) return <NotConfigured />;

  return (
    <AuthShell>
      <AuthForm mode="signup" next={safeNextPath(params.next)} initialError={params.error} />
      <AuthAside />
    </AuthShell>
  );
}
