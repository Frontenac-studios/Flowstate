import { HEAVY_TASK_WEIGHT, PROTECTED_BLOCK_WEIGHT, REGULAR_TASK_WEIGHT } from "./task-load-weight";

export type DayLoadTask = {
  id: string;
};

/**
 * Top-3-weighted day load for Week over-commit (WD3). Day priorities (WD1) count as
 * heavy units; protected blocks count fully as spoken-for time; external calendar
 * events add timed-hour and all-day weights (Phase 7).
 */
export function computeDayLoad(
  tasks: readonly DayLoadTask[],
  priorityTaskIds: ReadonlySet<string>,
  protectedBlockCount: number,
  taskWeightById?: Readonly<Record<string, number>>,
  externalCalendarLoadWeight = 0
): number {
  let load = 0;
  for (const task of tasks) {
    const override = taskWeightById?.[task.id];
    load +=
      override != null
        ? override
        : priorityTaskIds.has(task.id)
          ? HEAVY_TASK_WEIGHT
          : REGULAR_TASK_WEIGHT;
  }
  load += protectedBlockCount * PROTECTED_BLOCK_WEIGHT;
  load += externalCalendarLoadWeight;
  return load;
}

export function computeWeekDayLoads(input: {
  dates: readonly string[];
  tasksByDate: Readonly<Record<string, readonly DayLoadTask[]>>;
  priorityTaskIdsByDate: Readonly<Record<string, ReadonlySet<string>>>;
  protectedCountByDate: Readonly<Record<string, number>>;
  calendarLoadByDate?: Readonly<Record<string, number>>;
}): Record<string, number> {
  const loads: Record<string, number> = {};
  for (const iso of input.dates) {
    loads[iso] = computeDayLoad(
      input.tasksByDate[iso] ?? [],
      input.priorityTaskIdsByDate[iso] ?? new Set(),
      input.protectedCountByDate[iso] ?? 0,
      undefined,
      input.calendarLoadByDate?.[iso] ?? 0
    );
  }
  return loads;
}
