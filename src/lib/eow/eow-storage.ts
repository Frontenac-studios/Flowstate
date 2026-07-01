import { EOW_STORAGE_KEYS, EOW_SESSION_KEYS } from "./eow-constants";

export type EowStorageSnapshot = {
  snoozeUntil: string | null;
  dismissedWeekStart: string | null;
  skippedWeekStart: string | null;
  generateAttemptedForWeek: string | null;
};

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
    /* ignore */
  }
}

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readEowStorage(): EowStorageSnapshot {
  return {
    snoozeUntil: readLocal(EOW_STORAGE_KEYS.snoozeUntil),
    dismissedWeekStart: readLocal(EOW_STORAGE_KEYS.dismissedWeekStart),
    skippedWeekStart: readLocal(EOW_STORAGE_KEYS.skippedWeekStart),
    generateAttemptedForWeek: readSession(EOW_SESSION_KEYS.generateAttemptedForWeek),
  };
}

export function setEowSnoozeUntil(iso: string): void {
  writeLocal(EOW_STORAGE_KEYS.snoozeUntil, iso);
}

export function setEowDismissedWeekStart(weekStartIso: string): void {
  writeLocal(EOW_STORAGE_KEYS.dismissedWeekStart, weekStartIso);
}

export function setEowSkippedWeekStart(weekStartIso: string): void {
  writeLocal(EOW_STORAGE_KEYS.skippedWeekStart, weekStartIso);
}

export function setEowGenerateAttemptedForWeek(weekStartIso: string): void {
  writeSession(EOW_SESSION_KEYS.generateAttemptedForWeek, weekStartIso);
}

export function isEowSnoozed(now: Date, snoozeUntilIso: string | null): boolean {
  if (!snoozeUntilIso) return false;
  const until = Date.parse(snoozeUntilIso);
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}

export function isEowDismissedForWeek(
  weekStartIso: string,
  dismissedWeekStart: string | null
): boolean {
  return dismissedWeekStart === weekStartIso;
}

export function isEowSkippedForWeek(
  weekStartIso: string,
  skippedWeekStart: string | null
): boolean {
  return skippedWeekStart === weekStartIso;
}

export function isEowGenerateAttemptedForWeek(
  weekStartIso: string,
  attemptedWeekStart: string | null
): boolean {
  return attemptedWeekStart === weekStartIso;
}
