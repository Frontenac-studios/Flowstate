/**
 * Quarter arithmetic (W5). Pure so the header, the review trigger, and a target's
 * default period all read the same boundaries without a clock baked in — callers
 * pass `now`. Quarters are calendar quarters: Q1 Jan–Mar … Q4 Oct–Dec.
 */

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

export type Quarter = {
  year: number;
  /** 1–4. */
  quarter: number;
  /** Inclusive start (first instant of the quarter's first month). */
  start: Date;
  /** Exclusive end (first instant of the next quarter). */
  end: Date;
};

/** The calendar quarter containing `now`. */
export function quarterOf(now: Date): Quarter {
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 1);
  return { year, quarter, start, end };
}

/** "Q3 2026" — the short quarter tag. */
export function quarterLabel(q: Quarter): string {
  return `Q${q.quarter} ${q.year}`;
}

/** "Jul–Sep" — the month span of the quarter. */
export function quarterMonthSpan(q: Quarter): string {
  const startMonth = (q.quarter - 1) * 3;
  return `${MONTH_ABBR[startMonth]}–${MONTH_ABBR[startMonth + 2]}`;
}

/**
 * Whole days left in the quarter from `now` (0 on the last day). Uses the
 * exclusive end, so the final day counts as 1 day left, midnight-to-midnight.
 */
export function daysLeftInQuarter(q: Quarter, now: Date): number {
  const ms = q.end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)) - 1);
}

/**
 * True in the review window — the last `withinDays` (default 7) of the quarter.
 * The quarterly review banner drafts silently here (W5g).
 */
export function isQuarterClosing(q: Quarter, now: Date, withinDays = 7): boolean {
  return daysLeftInQuarter(q, now) < withinDays;
}
