import { describe, expect, it } from "vitest";

import {
  estimateRemainingSeconds,
  proposeSlipReplanDates,
  SLIP_REPLAN_DEFAULT_TASK_SECONDS,
} from "./propose-slip-replan";

describe("propose-slip-replan", () => {
  it("uses default task duration without time history", () => {
    const remaining = estimateRemainingSeconds({
      phaseId: "p1",
      phaseName: "Build",
      sortOrder: 0,
      currentStart: "2026-06-01",
      currentEnd: "2026-06-07",
      timeSpentSeconds: 0,
      incompleteTaskCount: 2,
      completedTaskCount: 0,
    });
    expect(remaining).toBe(SLIP_REPLAN_DEFAULT_TASK_SECONDS * 2);
  });

  it("extrapolates from logged time per completed task", () => {
    const remaining = estimateRemainingSeconds({
      phaseId: "p1",
      phaseName: "Build",
      sortOrder: 0,
      currentStart: null,
      currentEnd: null,
      timeSpentSeconds: 3600,
      incompleteTaskCount: 1,
      completedTaskCount: 2,
    });
    expect(remaining).toBe(1800);
  });

  it("proposes a later end date for a slipped phase", () => {
    const proposals = proposeSlipReplanDates("2026-06-10", [
      {
        phaseId: "p1",
        phaseName: "Build",
        sortOrder: 0,
        currentStart: "2026-06-01",
        currentEnd: "2026-06-07",
        timeSpentSeconds: 0,
        incompleteTaskCount: 2,
        completedTaskCount: 0,
      },
    ]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.endDate > "2026-06-07").toBe(true);
    expect(proposals[0]?.previousEndDate).toBe("2026-06-07");
  });

  it("skips when the computed end would not extend the schedule", () => {
    const proposals = proposeSlipReplanDates("2026-06-01", [
      {
        phaseId: "p1",
        phaseName: "Build",
        sortOrder: 0,
        currentStart: "2026-06-01",
        currentEnd: "2026-12-31",
        timeSpentSeconds: 0,
        incompleteTaskCount: 1,
        completedTaskCount: 0,
      },
    ]);
    expect(proposals).toHaveLength(0);
  });
});
