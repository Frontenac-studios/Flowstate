/**
 * Spec v5 (TodayB2): Today's list reads as separate cards — Overdue, Today (dated
 * today), Anytime (no date). Empty groups are dropped. Order inside a group is
 * the incoming order.
 */
export type TodayGroupKey = "overdue" | "today" | "anytime";

export type TodayGroup<T> = { key: TodayGroupKey; label: string; tasks: T[] };

const LABELS: Record<TodayGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  anytime: "Anytime",
};

export function groupTodayTasks<T extends { scheduledDate?: string | null }>(
  tasks: readonly T[],
  todayIso: string
): TodayGroup<T>[] {
  const buckets: Record<TodayGroupKey, T[]> = { overdue: [], today: [], anytime: [] };
  for (const task of tasks) {
    const date = task.scheduledDate ?? null;
    if (date === null) buckets.anytime.push(task);
    else if (date < todayIso) buckets.overdue.push(task);
    else buckets.today.push(task);
  }
  return (["overdue", "today", "anytime"] as const)
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: LABELS[key], tasks: buckets[key] }));
}
