import Link from "next/link";
import { CloudOff, Keyboard, LineChart, TriangleAlert, Upload } from "lucide-react";
import { Panel, PanelBody } from "@/components/ui/panel";

/**
 * Layout for the two auth pages: the form on the left at a comfortable reading
 * width, the reason to bother on the right. The site nav stays in place above,
 * because signing in is optional here and nobody should feel trapped on this
 * page.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-4xl items-start gap-8 py-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12 lg:py-10">
      {children}
    </div>
  );
}

const POINTS = [
  {
    icon: LineChart,
    title: "History that survives the browser",
    body: "Every test, its per-key hits and misses, and your streak are stored against your account instead of one browser's local storage.",
  },
  {
    icon: Keyboard,
    title: "The same weak keys everywhere",
    body: "Weak-key analysis reads your whole history, so the drill you get on a laptop knows what you fumbled on a desktop.",
  },
  {
    icon: Upload,
    title: "Nothing you have done is lost",
    body: "Tests you have already taken in this browser are uploaded to your account the first time you sign in.",
  },
];

export function AuthAside() {
  return (
    <aside className="flex flex-col gap-5">
      <ul className="flex flex-col gap-5">
        {POINTS.map((point) => (
          <li key={point.title} className="flex gap-3.5">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <point.icon className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-snug text-ink">{point.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{point.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2.5 rounded-md border border-line bg-muted/40 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
        <CloudOff className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />
        <span>
          An account is optional.{" "}
          <Link
            href="/"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            Keep typing without one
          </Link>{" "}
          and everything stays in this browser, exactly as before.
        </span>
      </p>
    </aside>
  );
}

/** Shown instead of the form when the Supabase environment variables are absent,
 *  so a fresh clone explains itself rather than throwing. */
export function NotConfigured() {
  return (
    <div className="mx-auto w-full max-w-lg py-10">
      <Panel>
        <PanelBody className="flex flex-col gap-4 py-7">
          <span className="flex size-10 items-center justify-center rounded-md bg-warning-soft text-warning">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
              Accounts are not configured
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              This deployment has no Supabase credentials, so there is nothing to sign
              in to. Copy <code className="font-mono text-[0.8125rem]">.env.example</code>{" "}
              to <code className="font-mono text-[0.8125rem]">.env.local</code>, fill in{" "}
              <code className="font-mono text-[0.8125rem]">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="font-mono text-[0.8125rem]">
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </code>
              , then restart the dev server.
            </p>
          </div>
          <p className="text-sm text-ink-soft">
            <Link
              href="/"
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
            >
              Go back to typing
            </Link>{" "}
            — the app works without an account.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
