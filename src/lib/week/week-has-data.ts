/** D21 — week chrome (lens bar, ritual bar, summary) appears once the week has data. */
export function weekHasPlanningData(input: {
  weekDates: readonly string[];
  tasks: ReadonlyArray<{ scheduledDate: string | null }>;
  protectedBlockCount: number;
  dayPriorityCount: number;
  externalEventCount?: number;
}): boolean {
  if (
    input.protectedBlockCount > 0 ||
    input.dayPriorityCount > 0 ||
    (input.externalEventCount ?? 0) > 0
  ) {
    return true;
  }
  const weekSet = new Set(input.weekDates);
  return input.tasks.some((task) => task.scheduledDate != null && weekSet.has(task.scheduledDate));
}
