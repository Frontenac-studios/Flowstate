import { DEFAULT_OVER_COMMIT_THRESHOLD } from "./over-commit-threshold";
import { computeDayLoad } from "./day-load";
import type { WeekDraftAssignment } from "./validate-week-draft-assignments";
import type { WeekDraftValidationContext } from "./validate-week-draft-assignments";

function dayLoadForAssignments(
  date: string,
  assignments: WeekDraftAssignment[],
  ctx: WeekDraftValidationContext
): number {
  const existing = ctx.existingTasksByDate[date] ?? [];
  const assignedIds = assignments
    .filter((row) => row.scheduledDate === date)
    .map((row) => row.taskId);
  const tasks = [...existing.map((row) => ({ id: row.id })), ...assignedIds.map((id) => ({ id }))];
  return computeDayLoad(
    tasks,
    ctx.priorityTaskIdsByDate[date] ?? new Set(),
    ctx.protectedCountByDate[date] ?? 0,
    ctx.taskWeightById
  );
}

/**
 * Move draft assignments off over-capacity days when a lighter day exists.
 * Protected blocks count as spoken-for load (Week §7).
 */
export function adjustWeekDraftForCapacity(
  assignments: WeekDraftAssignment[],
  ctx: WeekDraftValidationContext,
  weekDates: readonly string[],
  threshold: number = ctx.overCommitThreshold ?? DEFAULT_OVER_COMMIT_THRESHOLD
): WeekDraftAssignment[] {
  const result = assignments.map((row) => ({ ...row }));
  const byTaskId = new Map(result.map((row) => [row.taskId, row]));

  const sortedTargets = [...weekDates].sort(
    (a, b) => dayLoadForAssignments(a, result, ctx) - dayLoadForAssignments(b, result, ctx)
  );

  for (const row of result) {
    const load = dayLoadForAssignments(row.scheduledDate, result, ctx);
    if (load <= threshold) continue;

    for (const target of sortedTargets) {
      if (target === row.scheduledDate) continue;
      const previousDate = row.scheduledDate;
      row.scheduledDate = target;
      const targetLoad = dayLoadForAssignments(target, result, ctx);
      const sourceLoad = dayLoadForAssignments(previousDate, result, ctx);
      if (targetLoad <= threshold) {
        byTaskId.set(row.taskId, row);
        break;
      }
      row.scheduledDate = previousDate;
      void sourceLoad;
    }
  }

  return Array.from(byTaskId.values());
}
