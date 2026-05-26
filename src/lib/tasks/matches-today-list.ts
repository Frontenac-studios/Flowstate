export type TodayListTaskInput = {
  scheduledDate: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
};

export function matchesTodayList(task: TodayListTaskInput, todayIso: string): boolean {
  if (task.completedAt !== null) return false;
  if (task.bucketOverride === "later") return false;

  if (task.scheduledDate === null) return true;
  return task.scheduledDate <= todayIso;
}
