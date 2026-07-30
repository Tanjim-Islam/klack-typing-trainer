import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

export type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-ink-soft border-line",
  primary: "bg-primary-soft text-primary border-primary/25",
  accent: "bg-accent-soft text-accent border-accent/25",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5",
        "font-mono text-[0.6875rem] uppercase leading-normal tracking-[0.1em]",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Keycap                                                                     */
/* -------------------------------------------------------------------------- */

/** Renders a key legend the same way the app's heatmap does. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "keycap inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center px-1.5",
        "font-mono text-[0.6875rem] font-medium leading-none text-ink-soft",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-line bg-muted/50 text-ink-faint">
        {icon}
      </span>
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Stat tile                                                                  */
/* -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "ink",
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "ink" | "primary" | "accent" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tones = {
    ink: "text-ink",
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    danger: "text-danger",
  } as const;

  const sizes = {
    sm: "text-xl",
    md: "text-[1.75rem]",
    lg: "text-5xl sm:text-6xl",
  } as const;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="legend">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display font-semibold leading-none tnum tracking-tight",
            sizes[size],
            tones[tone],
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-xs lowercase text-ink-faint">{unit}</span>
        ) : null}
      </span>
      {hint ? <span className="text-xs leading-snug text-ink-soft">{hint}</span> : null}
    </div>
  );
}
