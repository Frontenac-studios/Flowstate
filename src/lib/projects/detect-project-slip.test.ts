import { describe, expect, it } from "vitest";

import { detectProjectSlip, isPhaseSlipped } from "./detect-project-slip";

describe("detect-project-slip", () => {
  const base = {
    phaseId: "p1",
    phaseName: "Build",
    effectiveStart: "2026-06-01",
    effectiveEnd: "2026-06-07",
    incompleteTaskCount: 2,
    hasTaskScheduledPastEnd: false,
  };

  it("flags a phase past end with incomplete tasks", () => {
    expect(isPhaseSlipped(base, "2026-06-10")).toBe(true);
    expect(detectProjectSlip({ todayIso: "2026-06-10", phases: [base] })).toHaveLength(1);
  });

  it("ignores complete phases even when past end", () => {
    expect(isPhaseSlipped({ ...base, incompleteTaskCount: 0 }, "2026-06-10")).toBe(false);
  });

  it("flags when a task is scheduled past the phase end", () => {
    const slipped = { ...base, effectiveEnd: "2026-06-20", hasTaskScheduledPastEnd: true };
    expect(isPhaseSlipped(slipped, "2026-06-10")).toBe(true);
  });

  it("ignores phases still inside their window", () => {
    expect(isPhaseSlipped(base, "2026-06-05")).toBe(false);
  });
});
