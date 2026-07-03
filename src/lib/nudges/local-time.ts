import { parseISODateString } from "@/lib/dates/local-day";

/** Client sends `-new Date().getTimezoneOffset()` (minutes east of UTC). */
export function toLocalISODate(now: Date, tzOffsetMinutes: number): string {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getLocalHour(now: Date, tzOffsetMinutes: number): number {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  return new Date(localMs).getUTCHours();
}

export function getLocalMinutes(now: Date, tzOffsetMinutes: number): number {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  const d = new Date(localMs);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function getLocalDayOfMonth(now: Date, tzOffsetMinutes: number): number {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  return new Date(localMs).getUTCDate();
}

export function getLocalDayOfWeek(now: Date, tzOffsetMinutes: number): number {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  return new Date(localMs).getUTCDay();
}

export function startedOnLocalDay(
  startedAt: Date,
  localDateIso: string,
  tzOffsetMinutes: number
): boolean {
  return toLocalISODate(startedAt, tzOffsetMinutes) === localDateIso;
}

export function calendarDaysBetween(earlierIso: string, laterIso: string): number {
  const earlier = parseISODateString(earlierIso);
  const later = parseISODateString(laterIso);
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

export function pinReferenceLocalDate(
  top3PinnedAt: Date | null,
  scheduledDate: string | null,
  tzOffsetMinutes: number,
  fallbackLocalDate: string
): string {
  if (top3PinnedAt) {
    return toLocalISODate(top3PinnedAt, tzOffsetMinutes);
  }
  if (scheduledDate) {
    return scheduledDate;
  }
  return fallbackLocalDate;
}

/** Default 14 (2pm). Set NUDGE_DEBUG_HOUR to override in development. */
export function nudgeThresholdHour(): number {
  const raw = process.env.NUDGE_DEBUG_HOUR;
  if (raw === undefined || raw === "") return 14;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 14;
}
