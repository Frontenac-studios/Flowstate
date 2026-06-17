/**
 * Local-development auth bypass.
 *
 * Lets `npm run dev` and `npm run desktop:dev` skip the login gate so the app
 * can be exercised without a Supabase session. Hard-gated to
 * `NODE_ENV === "development"`, so it can NEVER activate in a production build.
 *
 * When bypassed, tRPC and API routes use a stable dev user id so reads/writes
 * work against local SQLite (desktop) or Postgres (web dev). Sync to hosted
 * Supabase still requires a real session.
 */

/** Valid UUID v4 shape — used as userId in Drizzle rows during local dev. */
export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

export const DEV_USER_EMAIL = "dev@localhost";

export function isAuthBypassed(): boolean {
  return process.env.NODE_ENV === "development";
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
