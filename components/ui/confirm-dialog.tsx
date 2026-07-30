"use client";

import { AlertDialog } from "radix-ui";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * Destructive actions always route through here so nothing irreversible is one
 * click away. Focus lands on Cancel, not Confirm.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "danger" | "primary";
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[2px] data-[state=open]:animate-pop-in" />
        <AlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-line bg-surface p-6 shadow-pop data-[state=open]:animate-pop-in",
          )}
        >
          <div className="flex gap-4">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
                tone === "danger"
                  ? "bg-danger-soft text-danger"
                  : "bg-primary-soft text-primary",
              )}
            >
              <AlertTriangle className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <AlertDialog.Title className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description asChild>
                <div className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</div>
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
