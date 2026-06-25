/**
 * Derives a project's completion progress from its task counts.
 *
 * Kept pure (no DB, no React) so the index cards and the workspace project
 * column share one rounding rule. `completed` is clamped to `[0, total]` and a
 * project with no tasks reads as 0% (not NaN).
 */
export type ProjectProgress = {
  /** Whole-number percent, 0–100. */
  percent: number;
  completed: number;
  total: number;
};

export function projectProgress(completed: number, total: number): ProjectProgress {
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeCompleted = Math.min(Math.max(0, Math.trunc(completed)), safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  return { percent, completed: safeCompleted, total: safeTotal };
}
