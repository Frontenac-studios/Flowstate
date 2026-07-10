import type { Interval } from "@/lib/timeline/living-record";

export type DayBusyWindow = {
  fromMin: number;
  toMin: number;
};

function clipInterval(interval: Interval, window?: DayBusyWindow): Interval | null {
  const fromMin = window?.fromMin ?? 0;
  const toMin = window?.toMin ?? 1440;
  const startMin = Math.max(interval.startMin, fromMin);
  const endMin = Math.min(interval.endMin, toMin);
  if (startMin >= endMin) return null;
  return { startMin, endMin };
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const merged: Interval[] = [{ ...sorted[0]! }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, current.endMin);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/** Build merged busy intervals for a local day, optionally clipped to a minute window. */
export function buildDayBusyIntervals(
  intervals: ReadonlyArray<Interval>,
  window?: DayBusyWindow
): Interval[] {
  const clipped = intervals
    .map((interval) => clipInterval(interval, window))
    .filter((interval): interval is Interval => interval != null);
  return mergeIntervals(clipped);
}

/** Total minutes covered by merged busy intervals (overlaps counted once). */
export function sumBusyMinutes(intervals: ReadonlyArray<Interval>): number {
  return buildDayBusyIntervals(intervals).reduce(
    (total, interval) => total + (interval.endMin - interval.startMin),
    0
  );
}
