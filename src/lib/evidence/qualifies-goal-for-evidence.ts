const LARGE_HORIZONS = new Set(["quarter", "year"]);

/** E8: quarter-horizon+ OR 3+ milestones. */
export function qualifiesGoalForEvidenceEdition(
  targetHorizon: string | null,
  milestoneCount: number
): boolean {
  return (targetHorizon != null && LARGE_HORIZONS.has(targetHorizon)) || milestoneCount >= 3;
}
