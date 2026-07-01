export const MONTH_SHORT_NAMES = [
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

/** Calendar months in a quarter (Q1 → Jan–Mar, etc.). */
export function monthsForQuarter(quarter: number): number[] {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new RangeError(`quarter must be 1–4, got ${quarter}`);
  }
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
}

export function monthShortName(month: number): string {
  return MONTH_SHORT_NAMES[month - 1] ?? `M${month}`;
}
