/**
 * Local auth bypass for web dev and Kash desktop.
 *
 * Lets `npm run dev`, `npm run desktop:dev`, and the release Kash.app sidecar
 * skip the login gate so the app can be exercised without a Supabase session.
 * Web production/preview (Vercel) never bypasses. Desktop release bypass requires
 * `KASH_DESKTOP=1` at runtime (set by the bundled sidecar launcher).
 *
 * When bypassed, tRPC and API routes use a stable dev user id so reads/writes
 * work against local SQLite (desktop) or Postgres (web dev). Sync to hosted
 * Supabase still requires a real session.
 */

/** Valid UUID v4 shape — used as userId in Drizzle rows during local dev. */
export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

export const DEV_USER_EMAIL = "dev@localhost";

function isLocalDesktopRuntime(): boolean {
  return process.env.KASH_DESKTOP === "1" && !process.env.VERCEL;
}

export function isAuthBypassed(): boolean {
  return process.env.NODE_ENV === "development" || isLocalDesktopRuntime();
}

export type ResolvedAuth = {
  userId: string;
  email: string | null;
};

export function resolveAuthContext(
  user: { id: string; email?: string | null } | null | undefined
): ResolvedAuth | null {
  if (user?.id) {
    return { userId: user.id, email: user.email ?? null };
  }
  if (isAuthBypassed()) {
    return { userId: DEV_USER_ID, email: DEV_USER_EMAIL };
  }
  return null;
}
