/** Gentle yearly values review — local-only nudge state (§13 V1-6). */

export const VALUES_REVIEW_STORAGE_KEYS = {
  lastReviewedYear: "kash.aboutMe.valuesReview.lastReviewedYear",
  snoozeUntil: "kash.aboutMe.valuesReview.snoozeUntil",
} as const;

export type ValuesReviewStorageSnapshot = {
  lastReviewedYear: number | null;
  snoozeUntil: string | null;
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

export function readValuesReviewStorage(): ValuesReviewStorageSnapshot {
  return {
    lastReviewedYear: parseYear(readLocal(VALUES_REVIEW_STORAGE_KEYS.lastReviewedYear)),
    snoozeUntil: readLocal(VALUES_REVIEW_STORAGE_KEYS.snoozeUntil),
  };
}

export function markValuesReviewedForYear(year: number): void {
  writeLocal(VALUES_REVIEW_STORAGE_KEYS.lastReviewedYear, String(year));
  writeLocal(VALUES_REVIEW_STORAGE_KEYS.snoozeUntil, null);
}

export function snoozeValuesReviewUntil(iso: string): void {
  writeLocal(VALUES_REVIEW_STORAGE_KEYS.snoozeUntil, iso);
}

export function isValuesReviewSnoozed(now: Date, snoozeUntilIso: string | null): boolean {
  if (!snoozeUntilIso) return false;
  const until = Date.parse(snoozeUntilIso);
  if (Number.isNaN(until)) return false;
  return now.getTime() < until;
}

/** True when the user has a core set and has not reviewed this calendar year. */
export function isValuesYearlyReviewDue(
  now: Date,
  storage: ValuesReviewStorageSnapshot,
  valueCount: number,
  minValues: number
): boolean {
  if (valueCount < minValues) return false;
  if (isValuesReviewSnoozed(now, storage.snoozeUntil)) return false;

  const currentYear = now.getFullYear();
  return storage.lastReviewedYear === null || storage.lastReviewedYear < currentYear;
}
