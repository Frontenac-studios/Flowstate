import { formatHourLabel } from "@/lib/eod/wind-down";

/**
 * The week wind-down anchor — when the week wraps up (default Sunday 6pm). It
 * drives the soft end-of-week review chip (Week §7.6, mirrors Today §6 EoD).
 * Persisted in localStorage alongside other review preferences.
 */

export const WEEK_WIND_DOWN_STORAGE_KEY = "kash.eow.weekWindDown";
export const WEEK_WIND_DOWN_EVENT = "kash:week-winddown-changed";

export const WEEK_WIND_DOWN_MIN_DAY = 0;
export const WEEK_WIND_DOWN_MAX_DAY = 6;
export const WEEK_WIND_DOWN_MIN_HOUR = 12;
export const WEEK_WIND_DOWN_MAX_HOUR = 23;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeekWindDown = {
  day: number;
  hour: number;
};

export function defaultWeekWindDown(): WeekWindDown {
  return { day: 0, hour: 18 };
}

export function clampWeekWindDownDay(day: number): number {
  if (!Number.isFinite(day)) return defaultWeekWindDown().day;
  return Math.max(WEEK_WIND_DOWN_MIN_DAY, Math.min(WEEK_WIND_DOWN_MAX_DAY, Math.round(day)));
}

export function clampWeekWindDownHour(hour: number): number {
  if (!Number.isFinite(hour)) return defaultWeekWindDown().hour;
  return Math.max(WEEK_WIND_DOWN_MIN_HOUR, Math.min(WEEK_WIND_DOWN_MAX_HOUR, Math.round(hour)));
}

export function clampWeekWindDown(value: WeekWindDown): WeekWindDown {
  return {
    day: clampWeekWindDownDay(value.day),
    hour: clampWeekWindDownHour(value.hour),
  };
}

export function formatWeekWindDownLabel(value: WeekWindDown): string {
  const day = WEEKDAY_LABELS[clampWeekWindDownDay(value.day)] ?? "Sun";
  return `${day} ${formatHourLabel(value.hour)}`;
}

export function readWeekWindDown(): WeekWindDown {
  if (typeof window === "undefined") return defaultWeekWindDown();
  try {
    const raw = window.localStorage.getItem(WEEK_WIND_DOWN_STORAGE_KEY);
    if (raw == null) return defaultWeekWindDown();
    const parsed = JSON.parse(raw) as { day?: number; hour?: number };
    return clampWeekWindDown({
      day: parsed.day ?? defaultWeekWindDown().day,
      hour: parsed.hour ?? defaultWeekWindDown().hour,
    });
  } catch {
    return defaultWeekWindDown();
  }
}

export function writeWeekWindDown(value: WeekWindDown): void {
  if (typeof window === "undefined") return;
  const next = clampWeekWindDown(value);
  try {
    window.localStorage.setItem(WEEK_WIND_DOWN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(WEEK_WIND_DOWN_EVENT, { detail: next }));
}

/** True when local wall-clock has reached the configured week wind-down. */
export function isWeekWindDownDue(now: Date, settings: WeekWindDown): boolean {
  const { day, hour } = clampWeekWindDown(settings);
  return now.getDay() === day && now.getHours() >= hour;
}
