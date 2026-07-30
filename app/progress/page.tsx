import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Your typing speed over time, a keyboard accuracy heat map, and the keys worth drilling next.",
};

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
          Progress
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
          What is improving, what is not, and which keys are holding you back.
        </p>
      </header>

      <ProgressView />
    </div>
  );
}
