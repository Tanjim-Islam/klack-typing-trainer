"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export const DialogRoot = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
  } as const;

  return (
    <D.Portal>
      <D.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[2px]",
          "data-[state=open]:animate-pop-in",
        )}
      />
      <D.Content
        className={cn(
          // Centred with a viewport-safe max height; the body scrolls, not the page.
          "fixed left-1/2 top-1/2 z-50 flex w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
          "max-h-[calc(100dvh-3rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop",
          "data-[state=open]:animate-pop-in",
          widths[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <D.Title className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
              {title}
            </D.Title>
            {description ? (
              <D.Description className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {description}
              </D.Description>
            ) : null}
          </div>
          <D.Close
            aria-label="Close dialog"
            className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </D.Close>
        </div>

        {children ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        ) : null}

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-muted/40 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </D.Content>
    </D.Portal>
  );
}
