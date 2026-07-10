/** Top-3 / day-priority unit weight (Today §6 Q2, Week WD3). */
export const HEAVY_TASK_WEIGHT = 3;

/** Regular scheduled task unit weight. */
export const REGULAR_TASK_WEIGHT = 1;

/** Protected blocks count fully toward day load (Week §7 Q2). */
export const PROTECTED_BLOCK_WEIGHT = 1;

/** One load unit per clock hour of timed calendar busy (rounded up). */
export const CALENDAR_HOUR_WEIGHT = 1;

/** All-day external events add fixed load per day they occupy. */
export const ALL_DAY_EVENT_WEIGHT = 2;

export type LoadWeightedTask = {
  isTop3?: boolean;
  dayPriorityOrder?: number | null;
};

export function isHeavyTask(task: LoadWeightedTask): boolean {
  return Boolean(task.isTop3 || task.dayPriorityOrder);
}

export function taskLoadWeight(task: LoadWeightedTask): number {
  return isHeavyTask(task) ? HEAVY_TASK_WEIGHT : REGULAR_TASK_WEIGHT;
}
