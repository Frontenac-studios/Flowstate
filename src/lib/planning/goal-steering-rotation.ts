/** Last offered local date per goal (from `nudge_events` goal_step rows). */
export type GoalSteeringOfferHistory = ReadonlyMap<string, string>;

/**
 * Pick the next goal to steer toward — least-recently-offered first (G3).
 * Goals never offered sort before those with history; ties preserve input order.
 */
export function pickRotatedGoalId(
  orderedGoalIds: readonly string[],
  lastOfferedByGoal: GoalSteeringOfferHistory
): string | null {
  if (orderedGoalIds.length === 0) return null;

  const ranked = [...orderedGoalIds].sort((a, b) => {
    const dateA = lastOfferedByGoal.get(a) ?? null;
    const dateB = lastOfferedByGoal.get(b) ?? null;
    if (dateA == null && dateB == null) {
      return orderedGoalIds.indexOf(a) - orderedGoalIds.indexOf(b);
    }
    if (dateA == null) return -1;
    if (dateB == null) return 1;
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return orderedGoalIds.indexOf(a) - orderedGoalIds.indexOf(b);
  });

  return ranked[0] ?? null;
}

/** Store goal id in `nudge_events.task_ids` for rotation bookkeeping (G3). */
export function goalSteeringNudgeTaskIds(goalId: string): string[] {
  return [goalId];
}

/** Read goal id recorded on a goal_step nudge row. */
export function parseGoalIdFromNudgeTaskIds(
  taskIds: readonly string[] | null | undefined
): string | null {
  const first = taskIds?.[0];
  return first && first.length > 0 ? first : null;
}
