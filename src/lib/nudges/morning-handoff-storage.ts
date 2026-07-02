const MORNING_HANDOFF_DISMISSED_DATE_KEY = "kash.morningHandoff.dismissedDate";

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

export function isMorningHandoffDismissedForDate(localDate: string): boolean {
  return readLocal(MORNING_HANDOFF_DISMISSED_DATE_KEY) === localDate;
}

export function markMorningHandoffDismissedForDate(localDate: string): void {
  writeLocal(MORNING_HANDOFF_DISMISSED_DATE_KEY, localDate);
}
