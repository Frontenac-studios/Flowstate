import { toLocalISODate } from "@/lib/nudges/local-time";

export function countCompletionsToday(
  rows: { completedAt: Date | null }[],
  localDate: string,
  tzOffsetMinutes: number
): number {
  let count = 0;
  for (const row of rows) {
    if (!row.completedAt) continue;
    if (toLocalISODate(row.completedAt, tzOffsetMinutes) === localDate) {
      count += 1;
    }
  }
  return count;
}
