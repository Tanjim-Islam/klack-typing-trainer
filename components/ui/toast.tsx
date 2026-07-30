"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/format";

/**
 * A small toast queue. Built in-house rather than pulled in as a dependency so
 * the styling matches the panel system exactly and the live region behaviour
 * stays under our control.
 *
 * Entry animation is pure CSS. Removal is driven only by the timer, never by an
 * animation finishing: a toast raised just before the tab is backgrounded would
 * otherwise sit in the DOM indefinitely, because animation frames stop there.
 */

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  detail?: string;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const LIFETIME_MS = 4200;
const MAX_VISIBLE = 3;

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: TriangleAlert, className: "text-danger" },
  info: { icon: Info, className: "text-info" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (next: Omit<Toast, "id">) => {
      const id = createId();
      // Cap the stack so a burst of actions cannot bury the interface.
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { ...next, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4",
          // Clear the mobile tab bar, then sit in the corner from sm upwards.
          "pb-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:items-end sm:p-6",
        )}
      >
        {toasts.map((t) => {
          const { icon: Icon, className } = TONES[t.tone];
          return (
            <div
              key={t.id}
              className="animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-raised p-3.5 shadow-pop"
            >
              <Icon className={cn("mt-px size-4.5 shrink-0", className)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-ink">{t.message}</p>
                {t.detail ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.detail}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-muted hover:text-ink"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
