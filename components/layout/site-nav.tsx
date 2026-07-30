"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Flame, Keyboard, LineChart, Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { currentStreak } from "@/lib/analysis";
import { useStore, type Account } from "@/lib/store";
import { Tooltip } from "@/components/ui/tooltip";
import { AccountMenu } from "./account-menu";
import { AppearanceMenu } from "./appearance-menu";
import { HelpDialog } from "./help-dialog";

const LINKS = [
  { href: "/", label: "Type", icon: Keyboard },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/drills", label: "Drills", icon: Dumbbell },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-2"
      aria-label="Klack home"
    >
      <span className="keycap flex size-8 items-center justify-center font-display text-sm font-bold leading-none text-ink">
        K
      </span>
      <span className="font-display text-[1.0625rem] font-extrabold uppercase leading-none tracking-[-0.02em] text-ink">
        Klack
      </span>
    </Link>
  );
}

function StreakChip() {
  const { results, ready } = useStore();
  if (!ready) return null;
  const streak = currentStreak(results);
  if (streak < 1) return null;

  return (
    <Tooltip content={`${streak} day${streak === 1 ? "" : "s"} in a row with at least one test`}>
      <span className="flex items-center gap-1.5 rounded-md border border-accent/25 bg-accent-soft px-2 py-1 font-mono text-[0.6875rem] font-medium leading-none text-accent">
        <Flame className="size-3.5" aria-hidden />
        <span className="tnum">{streak}</span>
        <span className="sr-only">day streak</span>
      </span>
    </Tooltip>
  );
}

export function TopNav({ initialAccount = null }: { initialAccount?: Account | null }) {
  const isActive = useActive();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-15 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Wordmark />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-selected text-primary"
                        : "text-ink-soft hover:bg-muted hover:text-ink",
                    )}
                  >
                    <link.icon className="size-4" aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <StreakChip />
          <HelpDialog />
          <AppearanceMenu />
          <AccountMenu initialAccount={initialAccount} />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-4">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-md transition-colors",
                    active && "bg-selected",
                  )}
                >
                  <link.icon className="size-[1.15rem]" aria-hidden />
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
