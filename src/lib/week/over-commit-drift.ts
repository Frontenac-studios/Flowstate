import {
  COLD_START_WEEKS,
  DEFAULT_OVER_COMMIT_THRESHOLD,
  type OverCommitThresholdMode,
} from "./over-commit-threshold";

/** Learned baseline must exceed cold-start by at least this fraction (W2 / D8). */
export const OVER_COMMIT_DRIFT_RATIO = 0.3;

export type OverCommitDriftNote = {
  growthPercent: number;
  weeksInLearnedMode: number;
  message: string;
};

/**
 * When the learned threshold drifts ≥30% above the cold-start default, surface a
 * reflection-register note in the EoW review (Track W2 / WD3).
 */
export function evaluateOverCommitDrift(input: {
  threshold: number;
  mode: OverCommitThresholdMode;
  weeksWithPlanningHistory: number;
}): OverCommitDriftNote | null {
  if (input.mode !== "learned") return null;

  const ratio = input.threshold / DEFAULT_OVER_COMMIT_THRESHOLD;
  if (ratio < 1 + OVER_COMMIT_DRIFT_RATIO) return null;

  const growthPercent = Math.round((ratio - 1) * 100);
  const weeksInLearnedMode = Math.max(1, input.weeksWithPlanningHistory - COLD_START_WEEKS);
  const weekLabel = weeksInLearnedMode === 1 ? "week" : "weeks";

  return {
    growthPercent,
    weeksInLearnedMode,
    message: `Your typical day has grown ~${growthPercent}% in ${weeksInLearnedMode} ${weekLabel} — intended?`,
  };
}
