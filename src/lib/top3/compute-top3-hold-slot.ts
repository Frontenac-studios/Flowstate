import { nextOpenSlotMin, type Interval } from "@/lib/timeline/living-record";

import { TOP3_HOLD_DURATION_MIN } from "./constants";

export type Top3HoldSlot = {
  startMin: number;
  endMin: number;
};

/**
 * Places a Top-3 focus hold ghost around existing commitments — first open slot
 * at or after `fromMin` with room for the default hold duration.
 */
export function computeTop3HoldSlot(
  busy: ReadonlyArray<Interval>,
  fromMin: number,
  dayEndMin: number,
  durationMin: number = TOP3_HOLD_DURATION_MIN
): Top3HoldSlot | null {
  const startMin = nextOpenSlotMin(busy, fromMin, dayEndMin, durationMin);
  if (startMin == null) return null;
  return { startMin, endMin: startMin + durationMin };
}
