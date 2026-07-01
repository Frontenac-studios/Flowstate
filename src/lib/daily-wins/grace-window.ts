import { calendarDaysBetween, getLocalHour, toLocalISODate } from "@/lib/nudges/local-time";

/** DW-6: today is always writable; yesterday until local noon. */
export function isWinDateWritable(winDate: string, now: Date, tzOffsetMinutes: number): boolean {
  const today = toLocalISODate(now, tzOffsetMinutes);
  if (winDate === today) return true;

  const daysAgo = calendarDaysBetween(winDate, today);
  if (daysAgo === 1 && getLocalHour(now, tzOffsetMinutes) < 12) {
    return true;
  }

  return false;
}
