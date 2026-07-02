import { describe, expect, it } from "vitest";

import { computeTop3HoldSlot } from "./compute-top3-hold-slot";
import { TOP3_HOLD_DURATION_MIN } from "./constants";

describe("computeTop3HoldSlot", () => {
  it("returns the first open slot with default duration", () => {
    const slot = computeTop3HoldSlot([{ startMin: 600, endMin: 690 }], 540, 19 * 60);
    expect(slot).toEqual({ startMin: 690, endMin: 690 + TOP3_HOLD_DURATION_MIN });
  });

  it("returns null when the day cannot fit the hold", () => {
    const busy = [{ startMin: 7 * 60, endMin: 19 * 60 }];
    expect(computeTop3HoldSlot(busy, 8 * 60, 19 * 60)).toBeNull();
  });
});
