import { headers } from "next/headers";

/**
 * The origin to send OAuth and email links back to.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when set, and in production it should be: the
 * fallback below trusts the request's own Host header, which a caller controls.
 * Supabase's redirect allow-list is the backstop either way, but pinning the
 * origin explicitly means a forged header cannot even reach it.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Keeps `?next=` honest. Only same-site absolute paths are allowed through, so
 * a crafted sign-in link cannot bounce someone to another origin after a
 * successful login.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  // Reject anything that could resolve off-site: scheme-relative (`//evil`),
  // absolute URLs, and backslash variants that some clients normalise to `/`.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
