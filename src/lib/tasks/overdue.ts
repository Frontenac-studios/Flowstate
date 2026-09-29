/**
 * Spec v5 DetailA: a task can carry a deadline (`dueDate`) separate from its planned
 * day (`scheduledDate`). The deadline, when set, is what a task is "due" by — it
 * decides overdue, the due pill and the due lens. Without one, the planned day does
 * (the behaviour before deadlines existed).
 */
export type DueInput = {
  dueDate?: string | null;
  scheduledDate?: string | null;
};

/** The date a task is due by: its deadline, else its planned day. */
export function effectiveDueDate(task: DueInput): string | null {
  return task.dueDate ?? task.scheduledDate ?? null;
}

/** Overdue = the effective due date is before today (`YYYY-MM-DD` compare). */
export function isOverdue(task: DueInput, todayIso: string): boolean {
  const due = effectiveDueDate(task);
  return due !== null && due < todayIso;
}
