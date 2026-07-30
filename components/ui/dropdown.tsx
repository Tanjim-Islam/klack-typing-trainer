"use client";

import { DropdownMenu as M } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export const DropdownRoot = M.Root;
export const DropdownTrigger = M.Trigger;

const CONTENT = cn(
  // sideOffset in the component keeps a visible gap from the trigger.
  "z-50 min-w-[11rem] overflow-hidden rounded-lg border border-line bg-surface p-1.5 shadow-pop",
  "data-[state=open]:animate-pop-in",
);

const ITEM = cn(
  "flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink outline-none",
  "data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:text-disabled-ink",
);

export function DropdownContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(CONTENT, className)}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item {...props} className={cn(ITEM, className)}>
      {children}
    </M.Item>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <M.Label className="legend px-2.5 pb-1.5 pt-2">{children}</M.Label>;
}

export function DropdownSeparator() {
  return <M.Separator className="my-1.5 h-px bg-line" />;
}

export function DropdownRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <M.RadioGroup value={value} onValueChange={onValueChange}>
      {children}
    </M.RadioGroup>
  );
}

export function DropdownRadioItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <M.RadioItem value={value} className={cn(ITEM, "pl-2")}>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <M.ItemIndicator>
          <Check className="size-4 text-primary" aria-hidden />
        </M.ItemIndicator>
      </span>
      {children}
    </M.RadioItem>
  );
}
