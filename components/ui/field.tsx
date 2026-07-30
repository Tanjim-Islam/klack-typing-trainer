"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Label, control, hint and error in one place, wired together with ids so the
 * error is announced and never communicated by colour alone.
 */
export function Field({
  label,
  hint,
  error,
  counter,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {counter ? <span className="legend shrink-0">{counter}</span> : null}
      </div>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-faint">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-xs font-medium leading-relaxed text-danger"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL = cn(
  "w-full rounded-md border border-line bg-raised px-3 text-sm text-ink",
  "placeholder:text-ink-faint transition-colors",
  "hover:border-ink-faint/60",
  "aria-invalid:border-danger aria-invalid:bg-danger-soft/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, "h-10", className)} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(CONTROL, "min-h-28 resize-y py-2.5 leading-relaxed", className)}
    />
  );
}

/** A settings row: label + description on the left, control on the right. */
export function SettingRow({
  label,
  description,
  htmlFor,
  descriptionId,
  control,
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  descriptionId?: string;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4",
        className,
      )}
    >
      <div className="min-w-0 max-w-prose">
        <label
          htmlFor={htmlFor}
          className={cn("text-sm font-medium text-ink", htmlFor && "cursor-pointer")}
        >
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
