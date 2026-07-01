import { describe, expect, it } from "vitest";

import { evaluateSelfCareWalk } from "./evaluate-self-care-walk";

describe("evaluateSelfCareWalk", () => {
  const base = {
    now: new Date("2026-07-01T16:00:00.000Z"),
    tzOffsetMinutes: -240,
    hadFocusTimeToday: true,
    alreadyNudgedToday: false,
  };

  it("fires after 11am when user had focus time", () => {
    expect(evaluateSelfCareWalk(base).shouldFire).toBe(true);
  });

  it("does not fire before 11am", () => {
    expect(
      evaluateSelfCareWalk({
        ...base,
        now: new Date("2026-07-01T14:00:00.000Z"),
      }).shouldFire
    ).toBe(false);
  });

  it("does not fire without focus time today", () => {
    expect(evaluateSelfCareWalk({ ...base, hadFocusTimeToday: false }).shouldFire).toBe(false);
  });

  it("does not fire when already nudged today", () => {
    expect(evaluateSelfCareWalk({ ...base, alreadyNudgedToday: true }).shouldFire).toBe(false);
  });
});
