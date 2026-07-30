"use client";

import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "keycap"
  | "outline"
  | "ghost"
  | "danger"
  | "dangerGhost";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-ink shadow-key hover:bg-primary-hover active:translate-y-px",
  keycap:
    "keycap text-ink hover:bg-muted active:translate-y-px active:shadow-none",
  outline:
    "border border-line bg-transparent text-ink hover:bg-muted active:translate-y-px",
  ghost: "text-ink-soft hover:bg-muted hover:text-ink",
  danger:
    "bg-danger text-danger-ink shadow-key hover:bg-danger-hover active:translate-y-px",
  dangerGhost: "text-danger hover:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-6 text-base",
  icon: "h-10 w-10",
  iconSm: "h-8 w-8",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = "keycap",
  size = "md",
  loading = false,
  asChild = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      {...props}
      type={asChild ? undefined : type}
      data-loading={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-md font-medium",
        "transition-[background-color,color,box-shadow,transform] duration-150 ease-key",
        "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {size !== "icon" && size !== "iconSm" ? children : null}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
