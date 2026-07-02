import { describe, expect, it } from "vitest";

import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import {
  PROBLEM_NUDGE_PRIORITY,
  problemNudgePriority,
  rankProblemNudges,
  shouldSuppressProblemNudges,
} from "./nudge-arbiter";

function chip(
  kind: EssentialNudgeChipPayload["kind"],
  priority: number
): EssentialNudgeChipPayload {
  return {
    kind,
    message: kind,
    klass: "problem",
    priority,
  };
}

describe("nudge arbiter (A4)", () => {
  it("documents problem-class priority: slip > balance > goal step", () => {
    expect(PROBLEM_NUDGE_PRIORITY.top3_slip).toBeLessThan(PROBLEM_NUDGE_PRIORITY.balance_lopsided);
    expect(PROBLEM_NUDGE_PRIORITY.balance_lopsided).toBeLessThan(PROBLEM_NUDGE_PRIORITY.goal_step);
  });

  it("maps kinds to the shared priority table", () => {
    expect(problemNudgePriority("top3_slip")).toBe(0);
    expect(problemNudgePriority("balance_lopsided")).toBe(1);
    expect(problemNudgePriority("goal_step")).toBe(2);
  });

  it("rankProblemNudges orders slip before balance before goal step", () => {
    const ranked = rankProblemNudges([
      chip("goal_step", PROBLEM_NUDGE_PRIORITY.goal_step),
      chip("top3_slip", PROBLEM_NUDGE_PRIORITY.top3_slip),
      chip("balance_lopsided", PROBLEM_NUDGE_PRIORITY.balance_lopsided),
    ]);
    expect(ranked.map((c) => c.kind)).toEqual(["top3_slip", "balance_lopsided", "goal_step"]);
  });

  it("suppresses problem initiations when over-committed", () => {
    expect(shouldSuppressProblemNudges(true)).toBe(true);
    expect(shouldSuppressProblemNudges(false)).toBe(false);
  });
});
