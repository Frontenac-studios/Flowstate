import { EOD_HOUR_DEFAULT } from "./eod-constants";

/**
 * The "wind-down" hour — when the day wraps up. It anchors two things (Today §6
 * Q3 + Thread 1): the soft End-of-day review nudge fires at this hour, and the
 * Top-3 target derives from it (wind-down − 1h). Persisted in localStorage,
 * alongside the other EoD preferences (snooze / skip), so there's no migration;
 * promoting it to a synced server setting is a clean later step.
 */

export const WIND_DOWN_STORAGE_KEY = "kash.eod.windDownHour";
/** Dispatched on the window when the wind-down hour changes, so readers re-sync. */
export const WIND_DOWN_EVENT = "kash:winddown-changed";

export const WIND_DOWN_MIN_HOUR = 12;
export const WIND_DOWN_MAX_HOUR = 23;

export function defaultWindDownHour(): number {
  return EOD_HOUR_DEFAULT;
}

export function clampWindDownHour(hour: number): number {
  if (!Number.isFinite(hour)) return defaultWindDownHour();
  return Math.max(WIND_DOWN_MIN_HOUR, Math.min(WIND_DOWN_MAX_HOUR, Math.round(hour)));
}

/** Top-3 target hour = wind-down − 1h (Today §6 Thread 1, derived default). */
export function top3TargetHour(windDownHour: number): number {
  return Math.max(0, clampWindDownHour(windDownHour) - 1);
}

/** A compact 12-hour label, e.g. 18 → "6:00p", 17 → "5:00p". */
export function formatHourLabel(hour: number): string {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const period = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00${period}`;
}

export function readWindDownHour(): number {
  if (typeof window === "undefined") return defaultWindDownHour();
  try {
    const raw = window.localStorage.getItem(WIND_DOWN_STORAGE_KEY);
    if (raw == null) return defaultWindDownHour();
    return clampWindDownHour(Number.parseInt(raw, 10));
  } catch {
    return defaultWindDownHour();
  }
}

export function writeWindDownHour(hour: number): void {
  if (typeof window === "undefined") return;
  const value = clampWindDownHour(hour);
  try {
    window.localStorage.setItem(WIND_DOWN_STORAGE_KEY, String(value));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(WIND_DOWN_EVENT, { detail: value }));
}
