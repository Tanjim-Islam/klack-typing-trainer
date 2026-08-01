"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogRoot, DialogTrigger } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/bits";
import { Tooltip } from "@/components/ui/tooltip";

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["Tab"], action: "Restart with fresh text and stay focused" },
  { keys: ["Esc"], action: "Reset the test and leave focus mode" },
  { keys: ["Shift", "Tab"], action: "Move focus out of the typing field" },
  { keys: ["Ctrl", "Backspace"], action: "Clear the current unfinished word" },
  { keys: ["Space"], action: "Skip to the next word (counts as a miss)" },
  { keys: ["Enter"], action: "Resume after the test loses focus" },
];

export function HelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <Tooltip content="How Klack works">
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="How Klack works">
            <CircleHelp className="size-4.5" aria-hidden />
          </Button>
        </DialogTrigger>
      </Tooltip>

      <DialogContent
        title="How Klack works"
        description="Three things worth knowing before your first run."
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <ol className="flex flex-col gap-5">
          {[
            {
              title: "Just start typing",
              body: "The clock starts on your first keystroke, not on a button. Pick a mode above the text and go.",
            },
            {
              title: "Every keystroke is measured per key",
              body: "Klack records which character you were aiming for and whether you hit it, so it can tell the difference between being slow and being inaccurate.",
            },
            {
              title: "Your weak keys become a drill",
              body: "Once there is enough data, Progress shows an accuracy heatmap of the whole keyboard and can generate a practice drill aimed at the keys costing you the most.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-soft font-mono text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">{step.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-7 border-t border-line pt-5">
          <h4 className="legend mb-3">Keyboard shortcuts</h4>
          <dl className="flex flex-col divide-y divide-line">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <dt className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dt>
                <dd className="text-right text-sm text-ink-soft">{shortcut.action}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-6 rounded-lg border border-line bg-muted/50 p-3.5 text-xs leading-relaxed text-ink-soft">
          Everything you type is scored in your browser and saved to this browser
          only. There is no account, and nothing is uploaded. You can export a
          backup or wipe your history from Settings.
        </p>
      </DialogContent>
    </DialogRoot>
  );
}
