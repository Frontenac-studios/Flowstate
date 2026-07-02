import { describe, expect, it } from "vitest";

import type { GoalSteeringOffer } from "@/lib/planning/goal-journey";
import { evaluateGoalSteering } from "./evaluate-goal-steering";

const offer: GoalSteeringOffer = {
  goalId: "g1",
  goalTitle: "Run a 5K",
  milestoneId: "m1",
  milestoneTitle: "Base miles",
  stepTitle: "Week 1 easy run",
  category: "body_mind",
};

describe("evaluateGoalSteering", () => {
  it("fires when enabled, offered, and the day has room", () => {
    const result = evaluateGoalSteering({
      offer,
      goalSteeringEnabled: true,
      alreadyNudgedToday: false,
      isOverCommitted: false,
    });
    expect(result.shouldFire).toBe(true);
    expect(result.offer).toEqual(offer);
  });

  it("skips when over-committed (shared arbiter signal)", () => {
    expect(
      evaluateGoalSteering({
        offer,
        goalSteeringEnabled: true,
        alreadyNudgedToday: false,
        isOverCommitted: true,
      }).shouldFire
    ).toBe(false);
  });

  it("dedupes per local date via alreadyNudgedToday", () => {
    expect(
      evaluateGoalSteering({
        offer,
        goalSteeringEnabled: true,
        alreadyNudgedToday: true,
        isOverCommitted: false,
      }).shouldFire
    ).toBe(false);
  });
});
