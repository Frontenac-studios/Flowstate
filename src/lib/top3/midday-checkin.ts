import { top3TargetHour } from "@/lib/eod/wind-down";
import { getLocalHour } from "@/lib/nudges/local-time";

import { TOP3_MIDDAY_CHECKIN_HOUR } from "./constants";

export type MiddayCheckinInput = {
  now: Date;
  tzOffsetMinutes: number;
  windDownHour: number;
  top3MiddayCheckinEnabled: boolean;
  isOverCommitted: boolean;
  pinnedCount: number;
  incompleteCount: number;
};

export type MiddayCheckinState =
  | { visible: false }
  | { visible: true; variant: "win" }
  | { visible: true; variant: "remaining"; hoursLeft: number };

/**
 * Load-aware midday line on Top3Slots (TD1). Suppressed when over-committed or
 * the setting is off; shows a quiet win when all pinned items are complete.
 */
export function computeMiddayCheckin(input: MiddayCheckinInput): MiddayCheckinState {
  const {
    now,
    tzOffsetMinutes,
    windDownHour,
    top3MiddayCheckinEnabled,
    isOverCommitted,
    pinnedCount,
    incompleteCount,
  } = input;

  if (!top3MiddayCheckinEnabled || isOverCommitted || pinnedCount === 0) {
    return { visible: false };
  }

  const localHour = getLocalHour(now, tzOffsetMinutes);
  if (localHour < TOP3_MIDDAY_CHECKIN_HOUR) {
    return { visible: false };
  }

  if (incompleteCount === 0) {
    return { visible: true, variant: "win" };
  }

  const targetHour = top3TargetHour(windDownHour);
  const hoursLeft = Math.max(0, targetHour - localHour);
  return { visible: true, variant: "remaining", hoursLeft };
}

export function formatMiddayCheckinLine(state: MiddayCheckinState): string | null {
  if (!state.visible) return null;
  if (state.variant === "win") return "all done — nice";
  const h = state.hoursLeft;
  const unit = h === 1 ? "hour" : "hours";
  return `still time for these · ${h} ${unit} left`;
}
