import { describe, expect, it } from "vitest";

import type { EvaluableConstraint } from "./constraint-eval";
import {
  dayOnlySlot,
  evaluateProposedSlot,
  shouldSuppressInAppNudges,
  softConstraintViolationCount,
} from "./constraint-eval";

const hardCommitment: EvaluableConstraint = {
  id: "c1",
  type: "commitment",
  label: "School run",
  severity: "hard",
  schedule: { days: [2, 4], startMin: 8 * 60, endMin: 8 * 60 + 30 },
};

const softPreference: EvaluableConstraint = {
  id: "p1",
  type: "preference",
  label: "No meetings after 3pm",
  severity: "soft",
  schedule: { days: [1, 2, 3, 4, 5], startMin: 15 * 60, endMin: 24 * 60 },
};

const weekdayHours: EvaluableConstraint = {
  id: "h1",
  type: "hours",
  label: "Working hours",
  severity: "hard",
  schedule: { days: [1, 2, 3, 4, 5], startMin: 8 * 60, endMin: 18 * 60 },
};

describe("evaluateProposedSlot", () => {
  it("hard commitments always fail overlapping slots", () => {
    const result = evaluateProposedSlot([hardCommitment], {
      dateIso: "2026-05-26",
      startMin: 8 * 60,
      endMin: 9 * 60,
    });
    expect(result.ok).toBe(false);
    expect(result.hardViolations).toHaveLength(1);
    expect(result.softViolations).toHaveLength(0);
  });

  it("hard commitments pass on non-matching days", () => {
    const result = evaluateProposedSlot([hardCommitment], {
      dateIso: "2026-05-25",
      startMin: 8 * 60,
      endMin: 9 * 60,
    });
    expect(result.ok).toBe(true);
  });

  it("soft preferences flag but do not hard-fail", () => {
    const result = evaluateProposedSlot([softPreference], {
      dateIso: "2026-05-27",
      startMin: 16 * 60,
      endMin: 17 * 60,
    });
    expect(result.ok).toBe(true);
    expect(result.hardViolations).toHaveLength(0);
    expect(result.softViolations).toHaveLength(1);
  });

  it("working-hours violations are hard when severity is hard", () => {
    const result = evaluateProposedSlot([weekdayHours], {
      dateIso: "2026-05-27",
      startMin: 6 * 60,
      endMin: 7 * 60,
    });
    expect(result.ok).toBe(false);
    expect(result.hardViolations[0]?.type).toBe("hours");
  });

  it("day-only slots reject hard commitment days", () => {
    const result = evaluateProposedSlot([hardCommitment], dayOnlySlot("2026-05-26"));
    expect(result.ok).toBe(false);
  });
});

describe("shouldSuppressInAppNudges", () => {
  it("suppresses outside working hours", () => {
    const evening = new Date(2026, 4, 27, 20, 0);
    expect(shouldSuppressInAppNudges(evening, [weekdayHours])).toBe(true);
  });

  it("allows during working hours", () => {
    const midday = new Date(2026, 4, 27, 12, 0);
    expect(shouldSuppressInAppNudges(midday, [weekdayHours])).toBe(false);
  });

  it("suppresses during hard commitments", () => {
    const schoolRun = new Date(2026, 4, 26, 8, 15);
    expect(shouldSuppressInAppNudges(schoolRun, [hardCommitment])).toBe(true);
  });

  it("does not suppress when no constraints configured", () => {
    const evening = new Date(2026, 4, 27, 20, 0);
    expect(shouldSuppressInAppNudges(evening, [])).toBe(false);
  });

  it("suppresses during an active focus session (DND-2)", () => {
    const midday = new Date(2026, 4, 27, 12, 0);
    expect(shouldSuppressInAppNudges(midday, [], { focusSessionActive: true })).toBe(true);
  });
});

describe("softConstraintViolationCount", () => {
  it("counts soft violations for a date", () => {
    expect(softConstraintViolationCount([softPreference], "2026-05-27")).toBe(1);
    expect(softConstraintViolationCount([softPreference], "2026-05-24")).toBe(0);
  });
});
