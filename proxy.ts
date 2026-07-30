import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed Middleware to Proxy. Same file position (project root,
 * alongside `app/`), same behaviour, new name — `middleware.ts` is deprecated.
 *
 * All this does is hand off to the Supabase session refresh. Keeping the logic
 * in `lib/` means it is testable and this file stays a one-liner.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every page request, but none of the requests that cannot carry a session
     * worth refreshing: Next.js internals, the favicon, and static assets.
     * Skipping them avoids an auth server round trip per image.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
