"use client";

import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={250} skipDelayDuration={200}>
      {children}
    </T.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={8}
          collisionPadding={10}
          className={cn(
            "z-50 max-w-[16rem] rounded-md border border-line bg-raised px-2.5 py-1.5",
            "text-xs leading-snug text-ink shadow-pop data-[state=delayed-open]:animate-pop-in",
            className,
          )}
        >
          {content}
          <T.Arrow className="fill-raised" width={10} height={5} />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
