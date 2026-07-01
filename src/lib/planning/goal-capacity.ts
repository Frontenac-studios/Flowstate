/** Capacity nudge for goals (PM11.3) — soft warning at ~130%+ committed vs available. */

/** Default weekly planning budget when no user target is set (40h). */
export const DEFAULT_WEEKLY_AVAILABLE_MINUTES = 40 * 60;

export const CAPACITY_NUDGE_RATIO = 1.3;

export type GoalCapacitySnapshot = {
  committedMinutes: number;
  availableMinutes: number;
  ratio: number;
  showNudge: boolean;
};

export function computeGoalCapacity(
  taskEstimates: readonly (number | null | undefined)[],
  availableMinutes: number = DEFAULT_WEEKLY_AVAILABLE_MINUTES
): GoalCapacitySnapshot {
  const committedMinutes = taskEstimates.reduce<number>(
    (sum, m) => sum + (typeof m === "number" && m > 0 ? m : 0),
    0
  );
  const ratio = availableMinutes > 0 ? committedMinutes / availableMinutes : 0;
  return {
    committedMinutes,
    availableMinutes,
    ratio,
    showNudge: ratio >= CAPACITY_NUDGE_RATIO,
  };
}

export function formatCapacityMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
