/**
 * Which closed fortnight the user has already seen, so the Ledger can carry a
 * quiet "this one is new" marker without ever reaching them anywhere else.
 *
 * Deliberately localStorage and not the database: this is a per-device reading
 * convenience, not a fact about the business. Losing it shows one redundant
 * marker, which is the correct failure.
 */
const KEY = "kash.ledger.lastSeenPeriod";

export function readLastSeenPeriodKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastSeenPeriodKey(periodKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, periodKey);
  } catch {
    /* ignore */
  }
}
