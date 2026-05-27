const WEEKDAY_TOKENS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** Start of the calendar day in local timezone. */
export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO date string YYYY-MM-DD for Postgres `date` columns. */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Header format: "Tue May 26" */
export function formatHeaderDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Start of ISO week (Monday) in local time. */
export function startOfIsoWeekMonday(ref: Date = new Date()): Date {
  const start = startOfLocalDay(ref);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return startOfLocalDay(addDays(start, -daysFromMonday));
}

/** Seven calendar days Mon–Sun for the ISO week containing `ref`. */
export function datesInIsoWeek(ref: Date = new Date()): Date[] {
  const monday = startOfIsoWeekMonday(ref);
  return Array.from({ length: 7 }, (_, i) => startOfLocalDay(addDays(monday, i)));
}

export function isDateInIsoWeek(iso: string, ref: Date = new Date()): boolean {
  const weekIsos = datesInIsoWeek(ref).map(toISODateString);
  return weekIsos.includes(iso);
}

/** End of ISO week (Sunday) in local time. */
export function endOfIsoWeekSunday(ref: Date = new Date()): Date {
  const start = startOfLocalDay(ref);
  const day = start.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return startOfLocalDay(addDays(start, daysUntilSunday));
}

/**
 * Resolve a weekday token (mon–sun) to the next occurrence on or after ref's week context.
 * If ref is that weekday, returns ref's calendar day.
 */
export function parseWeekdayToken(token: string, ref: Date = new Date()): Date | null {
  const key = token.toLowerCase().slice(0, 3);
  const target = WEEKDAY_TOKENS[key];
  if (target === undefined) return null;

  const start = startOfLocalDay(ref);
  const current = start.getDay();
  let delta = target - current;
  if (delta < 0) delta += 7;
  return startOfLocalDay(addDays(start, delta));
}

export function parseISODateString(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
