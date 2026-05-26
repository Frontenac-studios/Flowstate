export type TriageCandidateInput = {
  scheduledDate: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
};

/**
 * Carryover tasks from prior days that need morning triage.
 * Excludes unscheduled captures (scheduledDate null) and Later bucket overrides.
 */
export function isTriageCandidate(task: TriageCandidateInput, todayIso: string): boolean {
  if (task.completedAt !== null) return false;
  if (task.scheduledDate === null) return false;
  if (task.bucketOverride === "later") return false;
  return task.scheduledDate < todayIso;
}

export function filterTriageCandidates<T extends TriageCandidateInput>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter((task) => isTriageCandidate(task, todayIso));
}
