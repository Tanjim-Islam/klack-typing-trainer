import { z } from "zod";

/**
 * Credential validation, shared by the sign-in and sign-up forms and by the
 * Server Actions behind them. Server Functions are reachable by direct POST,
 * not only through the form, so the server parses the same schema again rather
 * than trusting that the client did.
 */

export const PASSWORD_MIN = 8;
export const DISPLAY_NAME_MAX = 48;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email("That does not look like an email address.")
      .max(254, "That email address is too long."),
  );

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(72, "Passwords are limited to 72 characters.")
    .refine((v) => v.trim().length > 0, "Enter a password."),
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX, `Keep it under ${DISPLAY_NAME_MAX} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

/**
 * What a Server Action hands back to `useActionState`.
 *
 * `fieldErrors` are attached to inputs, `error` is the form-level banner, and
 * `notice` covers the one success case that does not navigate: a sign-up that
 * needs its email confirmed. `values` echoes what was typed so a failed submit
 * does not empty the form.
 */
export interface AuthFormState {
  error?: string;
  notice?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "displayName", string>>;
  values?: { email?: string; displayName?: string };
}

export const emptyAuthState: AuthFormState = {};

/** Takes the first message per field; the inputs only have room for one. */
export function firstFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): NonNullable<AuthFormState["fieldErrors"]> {
  const out: NonNullable<AuthFormState["fieldErrors"]> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === "email" || key === "password" || key === "displayName") {
      out[key] ??= issue.message;
    }
  }
  return out;
}
