"use client";

import { Keyboard, Target, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

const STEPS = [
  {
    icon: Keyboard,
    title: "Type the words shown",
    body: "The clock starts on your first keystroke. Press Tab any time for fresh text.",
  },
  {
    icon: Target,
    title: "Every key gets scored",
    body: "Klack tracks which character you aimed for and whether you hit it.",
  },
  {
    icon: Wand2,
    title: "Weak keys become a drill",
    body: "After a few tests, Progress builds practice aimed at your worst keys.",
  },
];

export function OnboardingCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Panel className="relative animate-rise overflow-hidden border-primary/25 bg-primary-soft/40">
      <Button
        variant="ghost"
        size="iconSm"
        onClick={onDismiss}
        aria-label="Dismiss the introduction"
        className="absolute right-2 top-2"
      >
        <X className="size-4" aria-hidden />
      </Button>

      <div className="px-5 py-5 sm:px-6">
        <p className="legend">New here</p>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
          Klack measures your typing key by key, then drills what you keep missing.
        </h2>

        <ol className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-surface text-primary">
                <step.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug text-ink">
                  <span className="mr-1.5 font-mono text-xs text-primary">
                    {index + 1}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" onClick={onDismiss}>
            Start typing
          </Button>
          <p className="text-xs text-ink-soft">
            Nothing is uploaded. Your history stays in this browser.
          </p>
        </div>
      </div>
    </Panel>
  );
}
