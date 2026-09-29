import { isOverdue } from "./overdue";

export type TriageCandidateInput = {
  scheduledDate: string | null;
  /** Spec v5 deadline — decides overdue when set. */
  dueDate?: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
};

/**
 * Overdue tasks that need triage: past their deadline, or — without one — past
 * their planned day. Excludes undated captures and Later bucket overrides.
 * Mirrors `triageCandidatesWhere` in the tasks router.
 */
export function isTriageCandidate(task: TriageCandidateInput, todayIso: string): boolean {
  if (task.completedAt !== null) return false;
  if (task.bucketOverride === "later") return false;
  return isOverdue(task, todayIso);
}

export function filterTriageCandidates<T extends TriageCandidateInput>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter((task) => isTriageCandidate(task, todayIso));
}
