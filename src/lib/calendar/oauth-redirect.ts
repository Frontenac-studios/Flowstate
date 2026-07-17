/** Allowed Google OAuth redirect origins (desktop uses 127.0.0.1, not localhost). */
export const CALENDAR_OAUTH_REDIRECT_ORIGINS = [
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4310",
  "http://localhost:3000",
] as const;

const CALLBACK_PATH = "/api/calendar/google/callback";

/** 2× the 10-minute production cron — also used for desktop stale client refresh. */
export const CALENDAR_SYNC_FRESH_MS = 15 * 60_000;

export function calendarOAuthCallbackUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}${CALLBACK_PATH}`;
}

/**
 * Pick an OAuth redirect URI for this request.
 * Prefer the request origin when it is allowlisted (desktop 127.0.0.1), else env fallback.
 */
export function resolveCalendarOAuthRedirectUri(
  requestOrigin: string | null | undefined,
  envRedirectUri: string
): string {
  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin).origin;
      if ((CALENDAR_OAUTH_REDIRECT_ORIGINS as readonly string[]).includes(origin)) {
        return calendarOAuthCallbackUri(origin);
      }
      // Same host as configured production redirect (Vercel preview/prod).
      const envOrigin = new URL(envRedirectUri).origin;
      if (origin === envOrigin) {
        return calendarOAuthCallbackUri(origin);
      }
    } catch {
      // fall through
    }
  }
  return envRedirectUri;
}

/** True when lastSyncedAt is missing or older than the freshness window. */
export function isCalendarSyncStale(
  lastSyncedAt: Date | string | null | undefined,
  nowMs: number = Date.now(),
  freshMs: number = CALENDAR_SYNC_FRESH_MS
): boolean {
  if (lastSyncedAt == null) return true;
  const ts = typeof lastSyncedAt === "string" ? Date.parse(lastSyncedAt) : lastSyncedAt.getTime();
  if (Number.isNaN(ts)) return true;
  return nowMs - ts >= freshMs;
}
