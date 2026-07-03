export type StressBreathingInput = {
  /** Longest continuous focus segment today, in minutes. */
  longestFocusSegmentMin: number;
  /** Incomplete tasks scheduled for today. */
  incompleteTodayCount: number;
  /** Tasks past scheduled date and still open. */
  overdueCount: number;
  /** Most recent reflection mood in the last 3 days (1–5), or null. */
  recentMood: number | null;
  alreadyNudgedToday: boolean;
};

export type EvaluateStressBreathingResult = {
  shouldFire: boolean;
  message: string;
};

const LONG_FOCUS_MIN = 75;
const HEAVY_DAY_INCOMPLETE = 6;
const HEAVY_DAY_OVERDUE = 2;
const LOW_MOOD_MAX = 2;

export function templateStressBreathingMessage(): string {
  return "You've been at it a while — two minutes of breathing might help reset.";
}

/** Gentle breathing offer when focus + load + mood signal stress (SC-3, max 1/day). */
export function evaluateStressBreathing(
  input: StressBreathingInput
): EvaluateStressBreathingResult {
  const longFocus = input.longestFocusSegmentMin >= LONG_FOCUS_MIN;
  const heavyDay =
    input.incompleteTodayCount >= HEAVY_DAY_INCOMPLETE || input.overdueCount >= HEAVY_DAY_OVERDUE;
  const lowMood = input.recentMood != null && input.recentMood <= LOW_MOOD_MAX;

  const stressed = (longFocus || heavyDay) && (lowMood || longFocus);
  const shouldFire = stressed && !input.alreadyNudgedToday;

  return {
    shouldFire,
    message: templateStressBreathingMessage(),
  };
}
