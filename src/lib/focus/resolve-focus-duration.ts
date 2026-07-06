/** Default work-segment length when no block or estimate is available. */
export const DEFAULT_FOCUS_WORK_SECONDS = 25 * 60;

/** Default break length between work segments. */
export const DEFAULT_FOCUS_BREAK_SECONDS = 15 * 60;

type ResolveWorkDurationInput = {
  blockStartMin?: number | null;
  blockEndMin?: number | null;
  timeEstimateMinutes?: number | null;
};

/** Block length → task estimate → 25 min fallback. */
export function resolveFocusWorkDurationSeconds(input: ResolveWorkDurationInput): number {
  if (
    input.blockStartMin != null &&
    input.blockEndMin != null &&
    input.blockEndMin > input.blockStartMin
  ) {
    return (input.blockEndMin - input.blockStartMin) * 60;
  }
  if (input.timeEstimateMinutes != null && input.timeEstimateMinutes > 0) {
    return input.timeEstimateMinutes * 60;
  }
  return DEFAULT_FOCUS_WORK_SECONDS;
}
