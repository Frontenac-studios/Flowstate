/** Fixed sane default for the first ~3–4 weeks (Week §7 Q2 mockup). */
export const DEFAULT_OVER_COMMIT_THRESHOLD = 10;

/** Weeks of planning history before switching from cold-start to learned. */
export const COLD_START_WEEKS = 4;

/** Rolling lookback for the learned baseline (weeks). */
export const LEARNED_LOOKBACK_WEEKS = 8;

/** Minimum day samples with load > 0 before trusting the learned median. */
export const LEARNED_MIN_SAMPLE_DAYS = 14;

export type OverCommitThresholdMode = "cold-start" | "learned";

export type OverCommitThreshold = {
  threshold: number;
  mode: OverCommitThresholdMode;
};

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Cold-start default for early weeks; learned rolling median once enough history
 * exists. Drift guard (§11 reflection) is wired separately when that layer lands.
 */
export function resolveOverCommitThreshold(
  historicalDailyLoads: readonly number[],
  weeksWithPlanningHistory: number
): OverCommitThreshold {
  const positiveLoads = historicalDailyLoads.filter((load) => load > 0);
  const learned = median(positiveLoads);

  if (
    weeksWithPlanningHistory >= COLD_START_WEEKS &&
    positiveLoads.length >= LEARNED_MIN_SAMPLE_DAYS &&
    learned != null &&
    learned > 0
  ) {
    return { threshold: learned, mode: "learned" };
  }

  return { threshold: DEFAULT_OVER_COMMIT_THRESHOLD, mode: "cold-start" };
}

export function isDayOverCommitted(load: number, threshold: number): boolean {
  return load > threshold;
}
