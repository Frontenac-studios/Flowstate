import { describe, expect, it } from "vitest";

import { computeMiddayCheckin, formatMiddayCheckinLine } from "./midday-checkin";

describe("computeMiddayCheckin", () => {
  const base = {
    tzOffsetMinutes: 0,
    windDownHour: 18,
    top3MiddayCheckinEnabled: true,
    isOverCommitted: false,
    pinnedCount: 2,
    incompleteCount: 1,
  };

  it("is hidden before noon", () => {
    const state = computeMiddayCheckin({
      ...base,
      now: new Date("2026-07-01T11:00:00.000Z"),
    });
    expect(state.visible).toBe(false);
  });

  it("shows remaining hours after noon on a light day", () => {
    const state = computeMiddayCheckin({
      ...base,
      now: new Date("2026-07-01T13:00:00.000Z"),
    });
    expect(state).toEqual({ visible: true, variant: "remaining", hoursLeft: 4 });
    expect(formatMiddayCheckinLine(state)).toBe("still time for these · 4 hours left");
  });

  it("shows resting line on over-commit after noon (T3/EOD-3)", () => {
    const state = computeMiddayCheckin({
      ...base,
      now: new Date("2026-07-01T13:00:00.000Z"),
      isOverCommitted: true,
    });
    expect(state).toEqual({ visible: true, variant: "resting" });
    expect(formatMiddayCheckinLine(state)).toBe("Check-in resting — today is full");
  });

  it("shows a quiet win when all pinned items are complete", () => {
    const state = computeMiddayCheckin({
      ...base,
      now: new Date("2026-07-01T13:00:00.000Z"),
      incompleteCount: 0,
    });
    expect(formatMiddayCheckinLine(state)).toBe("all done — nice");
  });
});
