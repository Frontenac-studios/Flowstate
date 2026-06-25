import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/**
 * One slice of the Today balance bar: a category (or `null` for tasks without a
 * resolved category) and how many of the day's tasks fall under it.
 */
export type CategoryBalanceSegment = {
  category: ProjectCategory | null;
  count: number;
};

/** The minimal task shape the balance read needs — a subset of `PlanTaskRow`. */
type BalanceTask = {
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
};

/**
 * Count a day's tasks by life-area for the Today summary balance bar. A task
 * counts toward its category only when resolved (a set category that isn't
 * flagged unresolved); everything else falls into the trailing `null` slice.
 *
 * Segments come back in the canonical `PROJECT_CATEGORIES` order (so the bar's
 * colour order is stable regardless of task order), with the uncategorised
 * slice last, and empty slices omitted so the bar only shows what's present.
 */
export function computeCategoryBalance(tasks: ReadonlyArray<BalanceTask>): {
  segments: CategoryBalanceSegment[];
  total: number;
} {
  const counts = new Map<ProjectCategory | null, number>();

  for (const task of tasks) {
    const resolved = task.category && !task.categoryUnresolved ? task.category : null;
    counts.set(resolved, (counts.get(resolved) ?? 0) + 1);
  }

  const segments: CategoryBalanceSegment[] = [];
  for (const category of PROJECT_CATEGORIES) {
    const count = counts.get(category) ?? 0;
    if (count > 0) segments.push({ category, count });
  }
  const noneCount = counts.get(null) ?? 0;
  if (noneCount > 0) segments.push({ category: null, count: noneCount });

  return { segments, total: tasks.length };
}
