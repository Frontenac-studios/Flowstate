const ONBOARDING_COMPLETED_KEY = "kash.onboarding.completed";
const ONBOARDING_STARTED_KEY = "kash.onboarding.started";

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
  return readLocal(ONBOARDING_STARTED_KEY) === "1";
}

export function markOnboardingStarted(): void {
  writeLocal(ONBOARDING_STARTED_KEY, "1");
}

export function markOnboardingCompleted(): void {
  writeLocal(ONBOARDING_COMPLETED_KEY, "1");
  writeLocal(ONBOARDING_STARTED_KEY, null);
}
