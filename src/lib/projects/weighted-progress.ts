import { HEAVY_TASK_WEIGHT, REGULAR_TASK_WEIGHT } from "@/lib/week/task-load-weight";

export type WeightedProgressInput = {
  completed: boolean;
  isHeavy: boolean;
};

export type WeightedProgress = {
  /** Whole-number percent, 0–100. */
  percent: number;
  completedWeight: number;
  totalWeight: number;
};

/** §9 completion metric: completed task-weight ÷ total task-weight. */
export function weightedProgress(tasks: readonly WeightedProgressInput[]): WeightedProgress {
  let completedWeight = 0;
  let totalWeight = 0;

  for (const task of tasks) {
    const weight = task.isHeavy ? HEAVY_TASK_WEIGHT : REGULAR_TASK_WEIGHT;
    totalWeight += weight;
    if (task.completed) completedWeight += weight;
  }

  const percent = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  return { percent, completedWeight, totalWeight };
}
