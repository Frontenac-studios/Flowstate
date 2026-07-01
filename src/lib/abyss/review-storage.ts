const KEY = "kash.abyss.lastReviewMonth";
export function readLastReviewMonth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}
export function writeLastReviewMonth(monthKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, monthKey);
  } catch {
    /* ignore */
  }
}
