"use client";

import { Select as S, Switch as Sw, ToggleGroup as TG } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Switch                                                                     */
/* -------------------------------------------------------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  "aria-describedby": describedBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Sw.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-describedby={describedBy}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors duration-150",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "data-[state=unchecked]:bg-muted",
        "disabled:opacity-50",
      )}
    >
      <Sw.Thumb
        className={cn(
          "block size-4.5 rounded-full bg-raised shadow-sm transition-transform duration-150 ease-key",
          "translate-x-[3px] data-[state=checked]:translate-x-[23px]",
        )}
      />
    </Sw.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Segmented control                                                          */
/* -------------------------------------------------------------------------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when the label is an icon or an abbreviation. */
  title?: string;
}

/**
 * A row of keycaps. Used for the test mode and length pickers, where seeing
 * every option at once matters more than saving space.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <TG.Root
      type="single"
      value={value}
      aria-label={label}
      // Radix reports "" when the active item is clicked again; keep the
      // current value so the control can never end up with nothing selected.
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-muted/60 p-1",
        className,
      )}
    >
      {options.map((option) => (
        <TG.Item
          key={option.value}
          value={option.value}
          title={option.title}
          aria-label={option.title}
          className={cn(
            "inline-flex items-center justify-center rounded-md font-medium text-ink-soft",
            "transition-[background-color,color,box-shadow,transform] duration-150 ease-key",
            "hover:text-ink data-[state=on]:bg-keycap data-[state=on]:text-ink data-[state=on]:shadow-key",
            "active:translate-y-px data-[state=on]:active:translate-y-0",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[0.8125rem]",
          )}
        >
          {option.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  id,
  ariaLabel,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string }[];
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <S.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <S.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-10 min-w-0 items-center justify-between gap-2 rounded-md border border-line bg-keycap px-3",
          "text-sm text-ink shadow-key transition-colors hover:bg-muted",
          "data-[placeholder]:text-ink-faint",
          className,
        )}
      >
        <S.Value />
        <S.Icon>
          <ChevronDown className="size-4 text-ink-faint" aria-hidden />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "z-50 max-h-[18rem] min-w-[var(--radix-select-trigger-width)] overflow-hidden",
            "rounded-lg border border-line bg-surface p-1.5 shadow-pop data-[state=open]:animate-pop-in",
          )}
        >
          <S.Viewport>
            {options.map((option) => (
              <S.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-default select-none items-center gap-2.5 rounded-md py-2 pl-2 pr-3 text-sm text-ink outline-none",
                  "data-[highlighted]:bg-muted",
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <S.ItemIndicator>
                    <Check className="size-4 text-primary" aria-hidden />
                  </S.ItemIndicator>
                </span>
                <S.ItemText>{option.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
