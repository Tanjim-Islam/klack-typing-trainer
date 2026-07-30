"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Check,
  CloudAlert,
  CloudUpload,
  HardDrive,
  LoaderCircle,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore, type SyncState } from "@/lib/store";
import { signOut } from "@/app/auth/actions";
import { supabaseConfigured } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

/**
 * The account section of the settings page: who you are signed in as and
 * whether your history is actually reaching the database.
 *
 * The nav's avatar menu covers the same ground in one line. This is where it is
 * spelled out, next to the export and reset controls it affects.
 */

const SYNC: Record<
  SyncState,
  { icon: typeof Check; label: string; detail: string; className: string }
> = {
  local: {
    icon: HardDrive,
    label: "This browser only",
    detail: "Nothing leaves this device.",
    className: "text-ink-faint",
  },
  loading: {
    icon: LoaderCircle,
    label: "Loading your history",
    detail: "Fetching your tests and drills.",
    className: "text-ink-faint",
  },
  merging: {
    icon: CloudUpload,
    label: "Uploading this browser's history",
    detail: "Tests you took before signing in are being added to your account.",
    className: "text-info",
  },
  synced: {
    icon: Check,
    label: "Saved to your account",
    detail: "Every test, drill and setting is stored in the database.",
    className: "text-success",
  },
  error: {
    icon: CloudAlert,
    label: "Sync failed",
    detail:
      "Your last change is saved in this browser but did not reach your account. It will be retried the next time something changes.",
    className: "text-danger",
  },
};

export function AccountPanel() {
  const { account, sync, results, drills } = useStore();

  if (!supabaseConfigured) return null;

  const customDrills = drills.filter((d) => !d.builtIn).length;

  if (!account) {
    return (
      <Panel>
        <PanelHeader
          icon={<HardDrive className="size-4" aria-hidden />}
          title="No account"
          description="Your history lives in this browser's local storage. Clearing site data, or switching device, loses it."
        />
        <PanelBody className="flex flex-col gap-4">
          <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
            Sign in and your {results.length === 0 ? "history" : `${results.length} saved tests`}
            {customDrills > 0 ? ` and ${customDrills} custom drills` : ""} are uploaded to
            your account, then kept in step from any device. Nothing in this browser is
            deleted.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="primary">
              <Link href="/login?next=%2Fsettings">
                <LogIn className="size-4" aria-hidden />
                Sign in
              </Link>
            </Button>
            <Button asChild variant="keycap">
              <Link href="/signup?next=%2Fsettings">
                <UserPlus className="size-4" aria-hidden />
                Create an account
              </Link>
            </Button>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  const state = SYNC[sync];

  return (
    <Panel>
      <PanelHeader
        icon={<Check className="size-4" aria-hidden />}
        title="Your account"
        description="Tests, per-key accuracy, drills and these settings are stored against your account."
      />
      <PanelBody className="flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          {account.avatarUrl ? (
            <Image
              src={account.avatarUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-primary-soft font-display text-base font-semibold text-primary"
            >
              {(account.displayName ?? account.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            {account.displayName ? (
              <p className="truncate text-sm font-semibold text-ink">
                {account.displayName}
              </p>
            ) : null}
            <p
              className={cn(
                "truncate text-ink-soft",
                account.displayName ? "text-xs" : "text-sm font-semibold text-ink",
              )}
            >
              {account.email}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-3.5 py-3",
            sync === "error" ? "border-danger/25 bg-danger-soft/50" : "border-line bg-muted/40",
          )}
        >
          <state.icon
            className={cn("mt-0.5 size-4 shrink-0", state.className, {
              "animate-spin": sync === "loading",
            })}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-ink">{state.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{state.detail}</p>
          </div>
        </div>

        {/* A Server Action: only the server can clear the session cookies. */}
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </form>

        <p className="text-xs leading-relaxed text-ink-faint">
          Signing out leaves this browser&apos;s guest history untouched, so you can keep
          practising without an account and pick your history back up when you sign in
          again.
        </p>
      </PanelBody>
    </Panel>
  );
}
