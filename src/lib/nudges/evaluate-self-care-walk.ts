import { getLocalHour } from "./local-time";

export type SelfCareWalkInput = {
  now: Date;
  tzOffsetMinutes: number;
  /** User has logged at least one focus session today. */
  hadFocusTimeToday: boolean;
  alreadyNudgedToday: boolean;
};

export type EvaluateSelfCareWalkResult = {
  shouldFire: boolean;
  localHour: number;
};

/** Gentle walk prompt — once per day after mid-morning when the user has been working. */
export function evaluateSelfCareWalk(input: SelfCareWalkInput): EvaluateSelfCareWalkResult {
  const localHour = getLocalHour(input.now, input.tzOffsetMinutes);
  const shouldFire =
    localHour >= 11 && localHour < 17 && input.hadFocusTimeToday && !input.alreadyNudgedToday;

  return { shouldFire, localHour };
}

export function templateSelfCareWalkMessage(): string {
  return "You've been heads-down — a 10-minute walk might help before the next block.";
}
