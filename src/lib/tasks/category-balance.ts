import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";

/**
 * One slice of the Today balance bar: a category (or `null` for tasks without a
 * resolved category), its weighted size, and the raw task count behind it.
 *
 * `weight` is what sizes the bar; `taskCount` is the plain count shown in the
 * legend. Top-3 tasks carry more weight so a deep-work day reads as deep work,
 * not as whatever pile of five-minute errands happens to be largest (Today §6
 * Q2 — Top-3-weighted balance).
 */
export type CategoryBalanceSegment = {
  category: ProjectCategory | null;
  weight: number;
  taskCount: number;
};

export type CategoryBalance = {
  /** Present categories (weight > 0), canonical order, uncategorised last. */
  segments: CategoryBalanceSegment[];
  /** Core life-areas with nothing planned today — shown hatched, drive the warning. */
  emptyCategories: ProjectCategory[];
  /** Total weighted units across all tasks. */
  total: number;
  /** Total raw task count. */
  totalTasks: number;
  /** The category holding at least `DOMINANT_SHARE` of the weight, else null. */
  dominant: ProjectCategory | null;
  /** A dominant category alongside one or more empty life-areas — a lopsided day. */
  lopsided: boolean;
};

/** The minimal task shape the balance read needs — a subset of `PlanTaskRow`. */
type BalanceTask = {
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
  isTop3?: boolean;
};

/** A Top-3 task counts as three small tasks (Today §6 Q2). */
const TOP3_WEIGHT = 3;
const DEFAULT_WEIGHT = 1;

/** A single category this share (or more) of the weighted day reads as "mostly X". */
const DOMINANT_SHARE = 0.4;

function taskWeight(task: BalanceTask): number {
  return task.isTop3 ? TOP3_WEIGHT : DEFAULT_WEIGHT;
}

/**
 * Weigh a day's planned tasks by life-area for the Today summary balance bar.
 * Population is the day's planned tasks (done and not) so the read — and any
 * lopsided warning — is available from the morning, while there's still time to
 * rebalance (Today §6 Thread 3 — planned population).
 *
 * A task contributes to its category only when resolved (a set category not
 * flagged unresolved); everything else falls into the trailing `null` slice.
 * Present segments come back in canonical `PROJECT_CATEGORIES` order with the
 * uncategorised slice last; the five core life-areas with no planned weight are
 * reported separately in `emptyCategories`.
 *
 * Weighting is Top-3-based for now; the shape is deliberately a single weight
 * field so the input can later swap to recorded focus minutes (the §2 "upgrade
 * to time-based" path) without reworking this read or the view.
 */
export function computeCategoryBalance(tasks: ReadonlyArray<BalanceTask>): CategoryBalance {
  const weights = new Map<ProjectCategory | null, number>();
  const counts = new Map<ProjectCategory | null, number>();

  for (const task of tasks) {
    const resolved = task.category && !task.categoryUnresolved ? task.category : null;
    weights.set(resolved, (weights.get(resolved) ?? 0) + taskWeight(task));
    counts.set(resolved, (counts.get(resolved) ?? 0) + 1);
  }

  const segments: CategoryBalanceSegment[] = [];
  const emptyCategories: ProjectCategory[] = [];
  for (const category of PROJECT_CATEGORIES) {
    const weight = weights.get(category) ?? 0;
    if (weight > 0) {
      segments.push({ category, weight, taskCount: counts.get(category) ?? 0 });
    } else if (tasks.length > 0) {
      emptyCategories.push(category);
    }
  }
  const noneWeight = weights.get(null) ?? 0;
  if (noneWeight > 0) {
    segments.push({ category: null, weight: noneWeight, taskCount: counts.get(null) ?? 0 });
  }

  const total = segments.reduce((sum, s) => sum + s.weight, 0);

  let dominant: ProjectCategory | null = null;
  if (total > 0) {
    for (const segment of segments) {
      if (segment.category && segment.weight / total >= DOMINANT_SHARE) {
        dominant = segment.category;
        break;
      }
    }
  }

  return {
    segments,
    emptyCategories,
    total,
    totalTasks: tasks.length,
    dominant,
    lopsided: dominant !== null && emptyCategories.length > 0,
  };
}
