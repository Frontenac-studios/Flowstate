import { describe, expect, it } from "vitest";

import { COLD_START_WEEKS, DEFAULT_OVER_COMMIT_THRESHOLD } from "./over-commit-threshold";
import { evaluateOverCommitDrift, OVER_COMMIT_DRIFT_RATIO } from "./over-commit-drift";

describe("evaluateOverCommitDrift", () => {
  it("returns null in cold-start mode", () => {
    expect(
      evaluateOverCommitDrift({
        threshold: 20,
        mode: "cold-start",
        weeksWithPlanningHistory: 10,
      })
    ).toBeNull();
  });

  it("returns null when learned threshold is below the drift ratio", () => {
    const threshold = DEFAULT_OVER_COMMIT_THRESHOLD * (1 + OVER_COMMIT_DRIFT_RATIO - 0.01);
    expect(
      evaluateOverCommitDrift({
        threshold,
        mode: "learned",
        weeksWithPlanningHistory: 8,
      })
    ).toBeNull();
  });

  it("emits a reflection note when learned threshold drifts ≥30%", () => {
    const threshold = DEFAULT_OVER_COMMIT_THRESHOLD * 1.3;
    const note = evaluateOverCommitDrift({
      threshold,
      mode: "learned",
      weeksWithPlanningHistory: 10,
    });

    expect(note).toEqual({
      growthPercent: 30,
      weeksInLearnedMode: 6,
      message: "Your typical day has grown ~30% in 6 weeks — intended?",
    });
  });

  it("rounds growth percent and uses singular week copy", () => {
    const note = evaluateOverCommitDrift({
      threshold: 14,
      mode: "learned",
      weeksWithPlanningHistory: COLD_START_WEEKS + 1,
    });

    expect(note?.growthPercent).toBe(40);
    expect(note?.weeksInLearnedMode).toBe(1);
    expect(note?.message).toContain("1 week");
  });
});
