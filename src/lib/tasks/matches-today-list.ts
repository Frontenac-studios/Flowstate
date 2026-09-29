export type TodayListTaskInput = {
  scheduledDate: string | null;
  /** Spec v5 deadline. */
  dueDate?: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
};

/**
 * On Today: undated tasks, tasks planned for today or earlier, and — Spec v5 — tasks
 * whose deadline is today or past, even if they were planned for later.
 */
export function matchesTodayList(task: TodayListTaskInput, todayIso: string): boolean {
  if (task.completedAt !== null) return false;
  if (task.bucketOverride === "later") return false;

  if (task.dueDate && task.dueDate <= todayIso) return true;
  if (task.scheduledDate === null) return true;
  return task.scheduledDate <= todayIso;
}
