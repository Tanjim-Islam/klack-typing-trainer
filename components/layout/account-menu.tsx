"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  CloudAlert,
  CloudUpload,
  HardDrive,
  LoaderCircle,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore, type Account, type SyncState } from "@/lib/store";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownContent,
  DropdownItem,
  DropdownRoot,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * The account control in the top nav: a sign-in link for guests, an avatar menu
 * for everyone else.
 *
 * `initialAccount` is what the server rendered, used until the browser's auth
 * client has reported in. Without it a signed-in visitor would see "Sign in"
 * flash on every page load.
 */

const SYNC: Record<SyncState, { icon: typeof Check; label: string; className: string }> = {
  local: { icon: HardDrive, label: "This browser only", className: "text-ink-faint" },
  loading: { icon: LoaderCircle, label: "Loading your history", className: "text-ink-faint" },
  merging: {
    icon: CloudUpload,
    label: "Uploading this browser's history",
    className: "text-info",
  },
  synced: { icon: Check, label: "Saved to your account", className: "text-success" },
  error: { icon: CloudAlert, label: "Not saved — sync failed", className: "text-danger" },
};

function initials(account: Account): string {
  const source = account.displayName?.trim() || account.email?.trim() || "";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function Avatar({ account, size = 28 }: { account: Account; size?: number }) {
  // A provider picture can 404, or come from a host that is not in
  // next.config.ts. Either way, fall back to initials rather than a broken
  // image in the nav.
  const [broken, setBroken] = useState(false);

  if (account.avatarUrl && !broken) {
    return (
      <Image
        src={account.avatarUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full border border-line bg-primary-soft font-mono text-[0.6875rem] font-semibold uppercase leading-none text-primary"
      style={{ width: size, height: size }}
    >
      {initials(account)}
    </span>
  );
}

export function AccountMenu({ initialAccount }: { initialAccount: Account | null }) {
  const { account: live, authResolved, sync } = useStore();
  const pathname = usePathname();
  const signOutForm = useRef<HTMLFormElement>(null);

  const account = authResolved ? live : initialAccount;

  if (!account) {
    // On the auth pages themselves the button would point at the current page.
    if (pathname === "/login" || pathname === "/signup") return null;

    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/login${next}`}>
          <LogIn className="size-4" aria-hidden />
          Sign in
        </Link>
      </Button>
    );
  }

  const state = SYNC[sync];
  const name = account.displayName ?? account.email ?? "Your account";

  return (
    <DropdownRoot>
      <Tooltip content={name}>
        <DropdownTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Account: ${name}`}
            className="relative"
          >
            <Avatar account={account} />
            {sync === "error" ? (
              <span
                aria-hidden
                className="absolute right-1 top-1 size-2 rounded-full bg-danger ring-2 ring-canvas"
              />
            ) : null}
          </Button>
        </DropdownTrigger>
      </Tooltip>

      <DropdownContent className="min-w-[15rem]">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <Avatar account={account} size={34} />
          <div className="min-w-0">
            {account.displayName ? (
              <p className="truncate text-sm font-medium leading-snug text-ink">
                {account.displayName}
              </p>
            ) : null}
            <p
              className={cn(
                "truncate text-ink-soft",
                account.displayName ? "text-xs" : "text-sm font-medium text-ink",
              )}
            >
              {account.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 pb-2 pt-0.5">
          <state.icon
            className={cn("size-3.5 shrink-0", state.className, {
              "animate-spin": sync === "loading",
            })}
            aria-hidden
          />
          <span className="text-xs leading-snug text-ink-soft">{state.label}</span>
        </div>

        <DropdownSeparator />

        <DropdownItem asChild>
          <Link href="/settings">
            <User className="size-4 text-ink-faint" aria-hidden />
            Account and settings
          </Link>
        </DropdownItem>

        <DropdownSeparator />

        <DropdownItem onSelect={() => signOutForm.current?.requestSubmit()}>
          <LogOut className="size-4 text-ink-faint" aria-hidden />
          Sign out
        </DropdownItem>
      </DropdownContent>

      {/* A Server Action, not an onClick: only the server can clear the session
          cookies. The form sits outside the menu content because selecting an
          item closes (and unmounts) the portal, which would cancel the submit. */}
      <form ref={signOutForm} action={signOut} className="hidden" aria-hidden />
    </DropdownRoot>
  );
}
