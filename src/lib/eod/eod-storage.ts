import { EOD_SESSION_KEYS, EOD_STORAGE_KEYS } from "./eod-constants";

export type EodStorageSnapshot = {
  snoozeUntil: string | null;
  skippedDate: string | null;
  modalShownForDate: string | null;
  generateAttemptedForDate: string | null;
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
    /* ignore quota / private mode */
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

export function readEodStorage(): EodStorageSnapshot {
  return {
    snoozeUntil: readLocal(EOD_STORAGE_KEYS.snoozeUntil),
    skippedDate: readLocal(EOD_STORAGE_KEYS.skippedDate),
    modalShownForDate: readSession(EOD_SESSION_KEYS.modalShownForDate),
    generateAttemptedForDate: readSession(EOD_SESSION_KEYS.generateAttemptedForDate),
  };
}

export function setSnoozeUntil(iso: string): void {
  writeLocal(EOD_STORAGE_KEYS.snoozeUntil, iso);
}

export function clearSnooze(): void {
  writeLocal(EOD_STORAGE_KEYS.snoozeUntil, null);
}

export function setSkippedDate(localDate: string): void {
  writeLocal(EOD_STORAGE_KEYS.skippedDate, localDate);
}

export function setModalShownForDate(localDate: string): void {
  writeSession(EOD_SESSION_KEYS.modalShownForDate, localDate);
}

export function isGenerateAttemptedForDate(
  localDate: string,
  attemptedDate: string | null
): boolean {
  return attemptedDate === localDate;
}

export function setGenerateAttemptedForDate(localDate: string): void {
  writeSession(EOD_SESSION_KEYS.generateAttemptedForDate, localDate);
}

export function isSnoozed(now: Date, snoozeUntilIso: string | null): boolean {
  if (!snoozeUntilIso) return false;
  const until = Date.parse(snoozeUntilIso);
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}

export function isSkippedForDate(localDate: string, skippedDate: string | null): boolean {
  return skippedDate === localDate;
}
