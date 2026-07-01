/** Bingo year rollover nudges — local-only dismiss/snooze state (§11.2 YR-1). */

export const BINGO_YEAR_ROLLOVER_STORAGE_KEYS = {
  nextYearPromptDismissedForYear: "kash.plan.bingoRollover.nextYearPromptDismissedForYear",
  nextYearPromptSnoozeUntil: "kash.plan.bingoRollover.nextYearPromptSnoozeUntil",
  finalizeDismissedUrgency: "kash.plan.bingoRollover.finalizeDismissedUrgency",
  finalizeDismissedYear: "kash.plan.bingoRollover.finalizeDismissedYear",
  finalizeSnoozeUntil: "kash.plan.bingoRollover.finalizeSnoozeUntil",
} as const;

export type FinalizeReminderUrgency = "gentle" | "nudge" | "urgent";

export type BingoYearRolloverStorageSnapshot = {
  nextYearPromptDismissedForYear: number | null;
  nextYearPromptSnoozeUntil: string | null;
  finalizeDismissedUrgency: FinalizeReminderUrgency | null;
  finalizeDismissedYear: number | null;
  finalizeSnoozeUntil: string | null;
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

function parseYear(raw: string | null): number | null {
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  return Number.isFinite(year) && year >= 2000 && year <= 9999 ? year : null;
}

function parseUrgency(raw: string | null): FinalizeReminderUrgency | null {
  if (raw === "gentle" || raw === "nudge" || raw === "urgent") return raw;
  return null;
}

export function readBingoYearRolloverStorage(): BingoYearRolloverStorageSnapshot {
  return {
    nextYearPromptDismissedForYear: parseYear(
      readLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.nextYearPromptDismissedForYear)
    ),
    nextYearPromptSnoozeUntil: readLocal(
      BINGO_YEAR_ROLLOVER_STORAGE_KEYS.nextYearPromptSnoozeUntil
    ),
    finalizeDismissedUrgency: parseUrgency(
      readLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeDismissedUrgency)
    ),
    finalizeDismissedYear: parseYear(
      readLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeDismissedYear)
    ),
    finalizeSnoozeUntil: readLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeSnoozeUntil),
  };
}

export function dismissNextYearBingoPrompt(targetYear: number): void {
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.nextYearPromptDismissedForYear, String(targetYear));
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.nextYearPromptSnoozeUntil, null);
}

export function snoozeNextYearBingoPromptUntil(iso: string): void {
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.nextYearPromptSnoozeUntil, iso);
}

export function dismissFinalizeReminder(
  calendarYear: number,
  urgency: FinalizeReminderUrgency
): void {
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeDismissedUrgency, urgency);
  if (urgency === "urgent") {
    writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeDismissedYear, String(calendarYear));
  }
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeSnoozeUntil, null);
}

export function snoozeFinalizeReminderUntil(iso: string): void {
  writeLocal(BINGO_YEAR_ROLLOVER_STORAGE_KEYS.finalizeSnoozeUntil, iso);
}

export function isBingoRolloverSnoozed(now: Date, snoozeUntilIso: string | null): boolean {
  if (!snoozeUntilIso) return false;
  const until = Date.parse(snoozeUntilIso);
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}
