import { toLocalISODate } from "@/lib/nudges/local-time";

/**
 * Picks the rows completed on the browser-local `localDate` and orders them
 * most-recent first. Drives the persistent "Completed · n" section (AN-T1b):
 * because the filter is keyed on the local day, the section clears itself at the
 * local-midnight rollover (yesterday's completions stop matching `localDate`).
 *
 * Generic over the row shape so the same primitive serves the Today list and any
 * other surface that holds `{ completedAt }` rows.
 */
export function selectCompletionsToday<T extends { completedAt: Date | null }>(
  rows: readonly T[],
  localDate: string,
  tzOffsetMinutes: number
): (T & { completedAt: Date })[] {
  return rows
    .filter(
      (row): row is T & { completedAt: Date } =>
        row.completedAt != null && toLocalISODate(row.completedAt, tzOffsetMinutes) === localDate
    )
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}
