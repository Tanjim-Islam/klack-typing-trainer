import { cn } from "@/lib/cn";

/**
 * The one surface primitive: a machined panel with a hairline edge. Everything
 * boxed in Klack is a Panel so elevation stays consistent across pages.
 */
export function Panel({
  className,
  inset = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border border-line",
        inset ? "bg-muted/60" : "bg-surface shadow-tile",
        className,
      )}
    />
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-5 py-5 sm:px-6", className)} />;
}
