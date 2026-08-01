import type { Metadata } from "next";
import { Radio, ShieldCheck, Swords } from "lucide-react";
import { RaceLobby } from "@/components/race/race-lobby";

export const metadata: Metadata = {
  title: "1v1 typing race",
  description: "Create a live room, invite one opponent, and race on the same text and clock.",
};

export default function RacePage() {
  return (
    <div className="flex flex-col gap-7 sm:gap-9">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)] lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="keycap flex size-8 items-center justify-center text-primary">
              <Swords className="size-4" aria-hidden />
            </span>
            <span className="legend text-primary">Live 1v1</span>
          </div>
          <h1 className="font-display text-[1.9rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-ink sm:text-4xl">
            One text. One clock. No excuses.
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
            Share an eight-character code, wait for both players to press Start, then race
            through an identical passage after the same three-second countdown.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm lg:justify-self-end">
          <div className="rounded-lg border border-line bg-surface px-4 py-3 shadow-tile">
            <dt className="flex items-center gap-2 text-ink-soft">
              <Radio className="size-3.5 text-primary" aria-hidden />
              Room type
            </dt>
            <dd className="mt-1 font-semibold text-ink">Live and temporary</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface px-4 py-3 shadow-tile">
            <dt className="flex items-center gap-2 text-ink-soft">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              Fair start
            </dt>
            <dd className="mt-1 font-semibold text-ink">Server-broadcast countdown</dd>
          </div>
        </dl>
      </header>

      <RaceLobby />
    </div>
  );
}
