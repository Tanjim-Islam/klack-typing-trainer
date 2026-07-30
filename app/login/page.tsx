import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside, AuthShell, NotConfigured } from "@/components/auth/auth-shell";
import { safeNextPath } from "@/lib/site-url";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to keep your typing history, drills and per-key accuracy on every device.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signedout?: string }>;
}) {
  const params = await searchParams;

  if (!supabaseConfigured) return <NotConfigured />;

  return (
    <AuthShell>
      <AuthForm
        mode="signin"
        next={safeNextPath(params.next)}
        initialError={params.error}
        initialNotice={params.signedout ? "You are signed out." : undefined}
      />
      <AuthAside />
    </AuthShell>
  );
}
