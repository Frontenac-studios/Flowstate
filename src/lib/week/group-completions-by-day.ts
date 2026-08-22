import { toLocalISODate } from "@/lib/dates/local-time";

/**
 * Groups a flat feed of completed rows (e.g. `tasks.listRecentlyCompleted`) into
 * a map keyed by the browser-local ISO day the row was completed on, each day's
 * bucket ordered most-recent first. This is the multi-day generalisation of
 * `selectCompletionsToday`: the Week grid needs the completed tail scoped to
 * EACH visible day, not just today, so we partition once and index by ISO day.
 *
 * Because the key is the local day, a day's bucket empties itself at the
 * local-midnight rollover (its rows stop matching that ISO day). Generic over
 * the row shape so it serves any `{ completedAt }` feed.
 */
export function groupCompletionsByLocalDay<T extends { completedAt: Date | null }>(
  rows: readonly T[],
  tzOffsetMinutes: number
): Map<string, (T & { completedAt: Date })[]> {
  const byDay = new Map<string, (T & { completedAt: Date })[]>();

  for (const row of rows) {
    if (row.completedAt == null) continue;
    const iso = toLocalISODate(row.completedAt, tzOffsetMinutes);
    const bucket = byDay.get(iso);
    if (bucket) bucket.push(row as T & { completedAt: Date });
    else byDay.set(iso, [row as T & { completedAt: Date }]);
  }

  byDay.forEach((bucket) => {
    bucket.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  });

  return byDay;
}
