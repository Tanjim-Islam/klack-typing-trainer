import type { Metadata } from "next";
import { DrillsView } from "@/components/drills/drills-view";

export const metadata: Metadata = {
  title: "Drills",
  description:
    "Save your own practice text and drill the patterns you type most, from bracket pairs to product names.",
};

export default function DrillsPage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
          Drills
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
          Targeted practice on text you choose. Start from a built-in drill or write
          your own.
        </p>
      </header>

      <DrillsView />
    </div>
  );
}
