import { describe, expect, it } from "vitest";

import { evaluateLiftsMeNudge } from "./evaluate-lifts-me-nudge";

describe("evaluateLiftsMeNudge", () => {
  const now = new Date("2026-07-08T15:00:00.000Z");

  it("fires when a lifts-me practice has been quiet for a week", () => {
    const result = evaluateLiftsMeNudge({
      now,
      alreadyNudgedToday: false,
      practices: [{ activityId: "a1", title: "Morning walk" }],
      lastOccurredAt: new Map([["a1", new Date("2026-06-28T10:00:00.000Z")]]),
    });
    expect(result.shouldFire).toBe(true);
    expect(result.message).toContain("morning walk");
  });

  it("does not fire when already nudged today", () => {
    expect(
      evaluateLiftsMeNudge({
        now,
        alreadyNudgedToday: true,
        practices: [{ activityId: "a1", title: "Morning walk" }],
        lastOccurredAt: new Map(),
      }).shouldFire
    ).toBe(false);
  });
});
