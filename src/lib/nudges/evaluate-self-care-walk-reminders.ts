import type { Interval } from "@/lib/timeline/living-record";
import { openGaps } from "@/lib/timeline/living-record";

import { getLocalHour } from "./local-time";
import { templateSelfCareWalkMessage } from "./evaluate-self-care-walk";

export const SELF_CARE_WALK_REMINDER_KINDS = [
  "self_care_walk_1",
  "self_care_walk_2",
  "self_care_walk_3",
] as const;

export type SelfCareWalkReminderKind = (typeof SELF_CARE_WALK_REMINDER_KINDS)[number];

export type SelfCareWalkReminderInput = {
  now: Date;
  tzOffsetMinutes: number;
  /** Busy intervals (focus blocks, protected time) for today. */
  busyIntervals: ReadonlyArray<Interval>;
  rangeStartMin: number;
  rangeEndMin: number;
  nowMin: number;
  hadFocusTimeToday: boolean;
  nudgedKindsToday: ReadonlySet<string>;
};

export type SelfCareWalkReminderOffer = {
  kind: SelfCareWalkReminderKind;
  shouldFire: boolean;
  message: string;
};

const MIN_GAP_MINUTES = 30;
const MINUTES_BEFORE_GAP_END = 15;

/** Up to three walk reminders in open gaps between work blocks (SC-2). */
export function evaluateSelfCareWalkReminders(
  input: SelfCareWalkReminderInput
): SelfCareWalkReminderOffer[] {
  const localHour = getLocalHour(input.now, input.tzOffsetMinutes);
  if (localHour < 10 || localHour >= 18 || !input.hadFocusTimeToday) {
    return SELF_CARE_WALK_REMINDER_KINDS.map((kind) => ({
      kind,
      shouldFire: false,
      message: templateSelfCareWalkMessage(),
    }));
  }

  const gaps = openGaps(input.busyIntervals, input.rangeStartMin, input.rangeEndMin).filter(
    (gap) =>
      gap.endMin - gap.startMin >= MIN_GAP_MINUTES &&
      gap.endMin > input.nowMin &&
      gap.startMin <= input.nowMin + MINUTES_BEFORE_GAP_END
  );

  const eligible = gaps.slice(0, SELF_CARE_WALK_REMINDER_KINDS.length);

  return SELF_CARE_WALK_REMINDER_KINDS.map((kind, index) => {
    const gap = eligible[index];
    const shouldFire = gap != null && !input.nudgedKindsToday.has(kind);
    return {
      kind,
      shouldFire,
      message: templateSelfCareWalkMessage(),
    };
  });
}
