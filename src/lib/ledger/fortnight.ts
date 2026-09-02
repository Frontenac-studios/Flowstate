/**
 * W8 — the Ledger. Fortnight arithmetic, pure so the router, the stepper, and the
 * "is this period closed" test all read the same boundaries without a clock baked
 * in — callers pass `now`.
 *
 * A fortnight runs **Friday 00:00 → the following-but-one Friday 00:00** in the
 * caller's local wall-clock: fourteen days, Fri…Thu inclusive, closing at midnight
 * as the review Friday begins. So on any second Friday the fortnight you read has
 * just completed — no partial day in the denominator, and nothing stale.
 *
 * This is a deliberate deviation from the app's Monday-start week
 * (`localWeekUtcBounds`). The Ledger composes with nothing else week-shaped, and
 * every Monday-anchored alternative either fails to partition the timeline (a
 * Mon→second-Fri window is 12 days, orphaning two days per fortnight) or presents
 * a fortnight that is still running at the moment it is meant to be read.
 *
 * Parity is anchored to a fixed epoch Friday rather than the quarter start: a
 * quarter anchor re-phases the cycle four times a year and leaves a 1–13 day stub
 * each time, at which point "every second Friday" stops being true. It is not
 * anchored to the first logged entry either — that would make the boundaries a
 * function of database state, so a backfilled entry would silently re-phase all
 * history and the arithmetic could not be tested without a fixture DB.
 *
 * Day maths runs in a UTC-normalised calendar space (whole day numbers), so it is
 * exact across DST: only the final conversion to an instant applies the offset.
 * `tzOffsetMinutes` follows the app convention: minutes east of UTC
 * (`-new Date().getTimezoneOffset()`).
 */

/** A Friday. Parity anchor only — periods are well-defined before it (negative index). */
export const LEDGER_EPOCH_FRIDAY = "2026-01-02";

const DAY_MS = 86_400_000;
const PERIOD_DAYS = 14;

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type LedgerPeriod = {
  /** Stable identity: the period's first local day (a Friday), ISO YYYY-MM-DD. */
  key: string;
  /** First local day of the fortnight (a Friday). Same as `key`. */
  startDate: string;
  /** Last local day of the fortnight (a Thursday), inclusive. */
  endDate: string;
  /** The Friday the fortnight closes on — the day it becomes readable. */
  closesOn: string;
  /** Inclusive start instant (local midnight of `startDate`). */
  start: Date;
  /** Exclusive end instant (local midnight of `closesOn`). */
  end: Date;
  /** Signed fortnight index from the epoch; negative before it. */
  index: number;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole-day number for an ISO local date, in a fixed-offset calendar space. */
function dayNumberFromIso(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Not an ISO date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

/** Inverse of `dayNumberFromIso`. */
function isoFromDayNumber(day: number): string {
  const d = new Date(day * DAY_MS);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** The absolute instant of local midnight beginning `day`. */
function instantForDay(day: number, tzOffsetMinutes: number): Date {
  return new Date(day * DAY_MS - tzOffsetMinutes * 60_000);
}

/** The local calendar day number containing `instant`. */
function dayNumberForInstant(instant: Date, tzOffsetMinutes: number): number {
  const local = new Date(instant.getTime() + tzOffsetMinutes * 60_000);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / DAY_MS;
}

const EPOCH_DAY = dayNumberFromIso(LEDGER_EPOCH_FRIDAY);

/** Build the period with a given signed index. */
function periodByIndex(index: number, tzOffsetMinutes: number): LedgerPeriod {
  const startDay = EPOCH_DAY + index * PERIOD_DAYS;
  const closeDay = startDay + PERIOD_DAYS;
  return {
    key: isoFromDayNumber(startDay),
    startDate: isoFromDayNumber(startDay),
    endDate: isoFromDayNumber(closeDay - 1),
    closesOn: isoFromDayNumber(closeDay),
    start: instantForDay(startDay, tzOffsetMinutes),
    end: instantForDay(closeDay, tzOffsetMinutes),
    index,
  };
}

/** The fortnight containing `now` — the one still in progress. */
export function periodContaining(now: Date, tzOffsetMinutes: number): LedgerPeriod {
  const day = dayNumberForInstant(now, tzOffsetMinutes);
  return periodByIndex(Math.floor((day - EPOCH_DAY) / PERIOD_DAYS), tzOffsetMinutes);
}

/**
 * The most recent fortnight that has fully closed. This is what the Ledger opens
 * on: on a review Friday it is the fortnight that closed that morning.
 */
export function lastClosedPeriod(now: Date, tzOffsetMinutes: number): LedgerPeriod {
  return periodByIndex(periodContaining(now, tzOffsetMinutes).index - 1, tzOffsetMinutes);
}

/** Resolve a period from its key. Returns null when the key is not a period start. */
export function periodForKey(key: string, tzOffsetMinutes: number): LedgerPeriod | null {
  if (!ISO_DATE.test(key)) return null;
  const day = dayNumberFromIso(key);
  const offset = day - EPOCH_DAY;
  if (offset % PERIOD_DAYS !== 0) return null;
  return periodByIndex(offset / PERIOD_DAYS, tzOffsetMinutes);
}

/** Step `by` fortnights from `period` (negative = earlier). */
export function shiftPeriod(
  period: LedgerPeriod,
  by: number,
  tzOffsetMinutes: number
): LedgerPeriod {
  return periodByIndex(period.index + by, tzOffsetMinutes);
}

/** True once the fortnight has fully elapsed — the seal condition. */
export function isPeriodClosed(period: LedgerPeriod, now: Date): boolean {
  return now.getTime() >= period.end.getTime();
}

/** "14–27 Aug 2026", or "28 Aug – 10 Sep 2026" across a month boundary. */
export function formatPeriodLabel(period: LedgerPeriod): string {
  const s = ISO_DATE.exec(period.startDate)!;
  const e = ISO_DATE.exec(period.endDate)!;
  const sMonth = MONTH_ABBR[Number(s[2]) - 1];
  const eMonth = MONTH_ABBR[Number(e[2]) - 1];
  const sDay = Number(s[3]);
  const eDay = Number(e[3]);
  const year = e[1];
  if (s[1] === e[1] && s[2] === e[2]) return `${sDay}–${eDay} ${eMonth} ${year}`;
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`;
}
