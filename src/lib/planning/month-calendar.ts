import {
  addDays,
  parseISODateString,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

export type MonthCalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

/** ISO date bounds for a calendar month (inclusive). */
export function monthDateBounds(year: number, month: number): { start: string; end: string } {
  const start = toISODateString(new Date(year, month - 1, 1));
  const end = toISODateString(new Date(year, month, 0));
  return { start, end };
}

/** Days in a month (28–31). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Monday-start grid cells covering the month (leading/trailing days from adjacent months included).
 */
export function buildMonthCalendarGrid(year: number, month: number): MonthCalendarCell[] {
  const first = startOfLocalDay(new Date(year, month - 1, 1));
  const totalDays = daysInMonth(year, month);
  const mondayOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const gridStart = addDays(first, -mondayOffset);
  const cellCount = Math.ceil((mondayOffset + totalDays) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(gridStart, index);
    const iso = toISODateString(date);
    return {
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
    };
  });
}

/** Quarter (1–4) containing a calendar month. */
export function quarterForMonth(month: number): number {
  return Math.ceil(month / 3);
}

/** Mock suggested date for a flexible reserved day — first matching weekday in month. */
export function mockReservedDayDate(
  year: number,
  month: number,
  type: "outside" | "personal",
  takenDates: ReadonlySet<string>
): string | null {
  const targetWeekday = type === "outside" ? 6 : 0; // Sat / Sun
  const total = daysInMonth(year, month);

  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() !== targetWeekday) continue;
    const iso = toISODateString(date);
    if (!takenDates.has(iso)) return iso;
  }

  for (let day = 1; day <= total; day += 1) {
    const iso = toISODateString(new Date(year, month - 1, day));
    if (!takenDates.has(iso)) return iso;
  }

  return null;
}

export function isIsoInMonth(iso: string, year: number, month: number): boolean {
  const date = parseISODateString(iso);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}
