/**
 * A recurring occurrence is a *virtual* task row (from `merge-recurring-into-plan-list`)
 * whose `id` is a synthetic, non-uuid occurrence id. It must therefore be completed /
 * un-completed through the `recurrence.*Occurrence` procedures, never `tasks.complete` /
 * `tasks.uncomplete` (whose inputs validate `z.string().uuid()`). This helper is the one
 * place that decides which path a task takes, so the check can't drift between surfaces.
 */

export type OccurrenceRef = { recurrenceId: string; occurrenceDate: string };

export type MaybeOccurrenceTask = {
  isRecurringOccurrence?: boolean;
  recurrenceId?: string | null;
  occurrenceDate?: string | null;
};

/**
 * Returns the recurrence reference when `task` is a recurring occurrence, or `null`
 * when it's an ordinary task that completes by id.
 */
export function occurrenceRef(task: MaybeOccurrenceTask): OccurrenceRef | null {
  if (task.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
    return { recurrenceId: task.recurrenceId, occurrenceDate: task.occurrenceDate };
  }
  return null;
}
