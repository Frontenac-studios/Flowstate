import type { WeekDraftValidationContext } from "./validate-week-draft-assignments";

export type WeekDraftValidationSource = {
  weekDates: string[];
  inbox: Array<{ id: string; loadWeight: number }>;
  scheduledInWeek: Array<{ id: string; scheduledDate: string | null; loadWeight: number }>;
  protectedCountByDate: Record<string, number>;
  priorityTaskIdsByDate?: Readonly<Record<string, ReadonlySet<string>>>;
  overCommitThreshold: number;
};

export function weekDraftValidationContextFromSource(
  ctx: WeekDraftValidationSource
): WeekDraftValidationContext {
  const existingTasksByDate = Object.fromEntries(
    ctx.weekDates.map((iso) => [
      iso,
      ctx.scheduledInWeek
        .filter((task) => task.scheduledDate === iso)
        .map((task) => ({ id: task.id })),
    ])
  );
  const taskWeightById = Object.fromEntries(
    [...ctx.inbox, ...ctx.scheduledInWeek].map((task) => [task.id, task.loadWeight])
  );

  return {
    protectedCountByDate: ctx.protectedCountByDate,
    existingTasksByDate,
    priorityTaskIdsByDate: ctx.priorityTaskIdsByDate ?? {},
    taskWeightById,
    overCommitThreshold: ctx.overCommitThreshold,
  };
}
