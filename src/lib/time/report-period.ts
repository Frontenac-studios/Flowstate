import { localWeekUtcBounds } from "./local-week-bounds";

/**
 * Resolve a named reporting period to a [start, end) UTC window (W3). Weeks reuse
 * the app's Monday-start week; months are calendar months. All boundaries are the
 * local midnight of the period edge, expressed in UTC — so "this month" means the
 * user's month, not UTC's.
 */

export const REPORT_PERIODS = ["this_week", "last_week", "this_month", "last_month"] as const;
export type ReportPeriodKind = (typeof REPORT_PERIODS)[number];

export const REPORT_PERIOD_LABEL: Record<ReportPeriodKind, string> = {
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
};

/** Local midnight of the first of a month, as a UTC instant. */
function localMonthStart(year: number, month0: number, tzOffsetMinutes: number): Date {
  return new Date(Date.UTC(year, month0, 1) - tzOffsetMinutes * 60_000);
}

export function resolveReportPeriod(
  kind: ReportPeriodKind,
  now: Date,
  tzOffsetMinutes: number
): { start: Date; end: Date } {
  if (kind === "this_week") return localWeekUtcBounds(now, tzOffsetMinutes);
  if (kind === "last_week") {
    const thisWeek = localWeekUtcBounds(now, tzOffsetMinutes);
    return {
      start: new Date(thisWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: thisWeek.start,
    };
  }

  // Local calendar month. Shift `now` into local time to read its year/month.
  const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  const year = local.getUTCFullYear();
  const month0 = local.getUTCMonth();

  if (kind === "this_month") {
    return {
      start: localMonthStart(year, month0, tzOffsetMinutes),
      end: localMonthStart(year, month0 + 1, tzOffsetMinutes),
    };
  }
  // last_month
  return {
    start: localMonthStart(year, month0 - 1, tzOffsetMinutes),
    end: localMonthStart(year, month0, tzOffsetMinutes),
  };
}
