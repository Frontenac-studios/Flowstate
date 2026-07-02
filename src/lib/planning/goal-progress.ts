/** Hybrid goal progress — milestones complete when all linked tasks are done (PM1-3). */

export type MilestoneTaskCounts = {
  total: number;
  completed: number;
};

export type MilestoneProgress = {
  id: string;
  title: string;
  sortOrder: number;
  targetDate: string | null;
  completedAt: Date | null;
  taskCounts: MilestoneTaskCounts;
  /** Derived: all linked tasks completed (or no tasks = incomplete). */
  isComplete: boolean;
};

/** A milestone with at least one linked task is complete when every linked task is done. */
export function milestoneIsComplete(counts: MilestoneTaskCounts): boolean {
  return counts.total > 0 && counts.completed === counts.total;
}

/** Goal % = completed milestones / total milestones (0 if no milestones). */
export function goalProgressPercent(milestones: readonly MilestoneProgress[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.isComplete).length;
  return Math.round((done / milestones.length) * 100);
}
