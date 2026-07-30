"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, MailCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { signIn, signInWithGoogle, signUp } from "@/app/auth/actions";
import { emptyAuthState, PASSWORD_MIN, type AuthFormState } from "@/lib/auth/schema";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { GoogleMark } from "./google-mark";

/**
 * One component for both pages. Sign-in and sign-up differ by two things — a
 * display name field and which action runs — and splitting them would mean
 * maintaining the Google button, the divider, the error banner and the password
 * toggle twice.
 */

type Mode = "signin" | "signup";

const COPY = {
  signin: {
    heading: "Sign in",
    blurb: "Pick up your history, drills and weak keys on any device.",
    submit: "Sign in",
    google: "Continue with Google",
    swapPrompt: "New here?",
    swapLabel: "Create an account",
    swapHref: "/signup",
  },
  signup: {
    heading: "Create your account",
    blurb: "Your tests, per-key accuracy and drills follow you from now on.",
    submit: "Create account",
    google: "Sign up with Google",
    swapPrompt: "Already have an account?",
    swapLabel: "Sign in",
    swapHref: "/login",
  },
} as const;

/** Reads the parent form's state, which is the only way to show a pending
 *  submit on a `<form action={…}>` that has no useActionState of its own. */
function SubmitButton({
  children,
  variant = "primary",
  className,
  icon,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size="md"
      loading={pending}
      className={cn("w-full", className)}
    >
      {!pending && icon ? icon : null}
      {children}
    </Button>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? AlertCircle : MailCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm leading-relaxed",
        tone === "error"
          ? "border-danger/25 bg-danger-soft/60 text-danger"
          : "border-success/25 bg-success-soft/60 text-success",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0">{children}</p>
    </div>
  );
}

export function AuthForm({
  mode,
  next = "/",
  initialError,
  initialNotice,
}: {
  mode: Mode;
  /** Where to land after success. Already validated as a same-site path. */
  next?: string;
  /** A message handed over in the query string, e.g. by the callback route. */
  initialError?: string;
  initialNotice?: string;
}) {
  const copy = COPY[mode];
  const action = mode === "signin" ? signIn : signUp;

  const initial: AuthFormState = initialError
    ? { ...emptyAuthState, error: initialError }
    : initialNotice
      ? { ...emptyAuthState, notice: initialNotice }
      : emptyAuthState;

  const [state, formAction] = useActionState(action, initial);
  const [revealed, setRevealed] = useState(false);

  return (
    <Panel className="w-full">
      <PanelBody className="flex flex-col gap-5 py-6 sm:py-7">
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink">
            {copy.heading}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy.blurb}</p>
        </div>

        {state.error ? <Banner tone="error">{state.error}</Banner> : null}
        {state.notice ? <Banner tone="success">{state.notice}</Banner> : null}

        {/* Its own form: a button cannot post to a different action from inside
            the credentials form, and forms cannot nest. */}
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <SubmitButton
            variant="outline"
            icon={<GoogleMark className="size-4.5" />}
            className="h-11"
          >
            {copy.google}
          </SubmitButton>
        </form>

        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="legend">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />

          {mode === "signup" ? (
            <Field
              label="Display name"
              hint="Optional. Only used to greet you in the app."
              error={state.fieldErrors?.displayName}
            >
              {(props) => (
                <Input
                  {...props}
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  maxLength={48}
                  defaultValue={state.values?.displayName ?? ""}
                  placeholder="Ada"
                />
              )}
            </Field>
          ) : null}

          <Field label="Email" required error={state.fieldErrors?.email}>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                defaultValue={state.values?.email ?? ""}
                placeholder="you@example.com"
              />
            )}
          </Field>

          <Field
            label="Password"
            required
            hint={mode === "signup" ? `At least ${PASSWORD_MIN} characters.` : undefined}
            error={state.fieldErrors?.password}
          >
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  name="password"
                  type={revealed ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={mode === "signup" ? PASSWORD_MIN : undefined}
                  required
                  className="pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  aria-label={revealed ? "Hide password" : "Show password"}
                  aria-pressed={revealed}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-faint transition-colors hover:text-ink"
                >
                  {revealed ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            )}
          </Field>

          <SubmitButton>{copy.submit}</SubmitButton>
        </form>

        <p className="text-sm text-ink-soft">
          {copy.swapPrompt}{" "}
          <Link
            href={next === "/" ? copy.swapHref : `${copy.swapHref}?next=${encodeURIComponent(next)}`}
            className="rounded font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            {copy.swapLabel}
          </Link>
        </p>
      </PanelBody>
    </Panel>
  );
}
