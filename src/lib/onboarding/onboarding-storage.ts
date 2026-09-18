const ONBOARDING_COMPLETED_KEY = "kash.onboarding.completed";
const ONBOARDING_STARTED_KEY = "kash.onboarding.started";

/**
 * How long a started flow stays resumable. Inside the window a refresh mid-setup
 * drops you back where you were; outside it, an abandoned run is forgotten and a
 * user who already has work is never dragged back into first-run setup.
 */
export const ONBOARDING_RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isOnboardingCompleted(): boolean {
  return readLocal(ONBOARDING_COMPLETED_KEY) === "1";
}

/** True once a fresh empty day entered the flow (survives refresh mid-setup). */
export function isOnboardingStarted(): boolean {
  return readLocal(ONBOARDING_STARTED_KEY) !== null;
}

/**
 * Whether a stored start marker is still worth resuming.
 *
 * Legacy clients wrote the flag as `"1"` with no clock. Those are by definition
 * old — the timestamped format shipped with this fix — so they are treated as
 * expired rather than resumed forever.
 */
export function isResumableStart(
  value: string | null,
  now: number,
  windowMs: number = ONBOARDING_RESUME_WINDOW_MS
): boolean {
  if (value === null) return false;
  const startedAt = Number(value);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return false;
  if (startedAt > now) return false;
  return now - startedAt < windowMs;
}

/** True when a flow was started recently enough to pick back up. */
export function isOnboardingResumable(now: number = Date.now()): boolean {
  return isResumableStart(readLocal(ONBOARDING_STARTED_KEY), now);
}

/**
 * Stamps the start of a flow. Idempotent inside the resume window: re-marking on
 * every mount must not push the clock forward, or the marker would never expire.
 */
export function markOnboardingStarted(now: number = Date.now()): void {
  if (isResumableStart(readLocal(ONBOARDING_STARTED_KEY), now)) return;
  writeLocal(ONBOARDING_STARTED_KEY, String(now));
}

export function markOnboardingCompleted(): void {
  writeLocal(ONBOARDING_COMPLETED_KEY, "1");
  writeLocal(ONBOARDING_STARTED_KEY, null);
}
