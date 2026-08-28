import { describe, expect, it } from "vitest";

import { quarterOf } from "./quarter-period";
import {
  classifyOutcome,
  draftLearningRuling,
  draftTargetRuling,
  reviewPhase,
} from "./quarter-review";

describe("classifyOutcome", () => {
  it("met at or above target, partial at half, missed below", () => {
    expect(classifyOutcome(100, 100)).toBe("met");
    expect(classifyOutcome(120, 100)).toBe("met");
    expect(classifyOutcome(50, 100)).toBe("partial");
    expect(classifyOutcome(99, 100)).toBe("partial");
    expect(classifyOutcome(49, 100)).toBe("missed");
    expect(classifyOutcome(0, 100)).toBe("missed");
  });

  it("a zero-target (shipped) bet is met once anything lands", () => {
    expect(classifyOutcome(1, 0)).toBe("met");
    expect(classifyOutcome(0, 0)).toBe("met");
  });
});

describe("draftTargetRuling", () => {
  it("drafts Done for met, Carry for anything short — never Drop", () => {
    expect(draftTargetRuling("met")).toBe("done");
    expect(draftTargetRuling("partial")).toBe("carry");
    expect(draftTargetRuling("missed")).toBe("carry");
  });
});

describe("draftLearningRuling", () => {
  it("Reached only when all milestones are complete", () => {
    expect(draftLearningRuling(3, 3)).toBe("reached");
    expect(draftLearningRuling(3, 2)).toBe("carry");
    expect(draftLearningRuling(0, 0)).toBe("carry"); // no milestones → not reached
  });
});

describe("reviewPhase", () => {
  const q = quarterOf(new Date("2026-08-15")); // Q3 2026: Jul 1 – Oct 1

  it("is active mid-quarter", () => {
    expect(reviewPhase(q, new Date("2026-08-15"))).toBe("active");
  });

  it("is closing in the last week", () => {
    expect(reviewPhase(q, new Date("2026-09-28"))).toBe("closing");
  });

  it("is overdue once the quarter has ended", () => {
    expect(reviewPhase(q, new Date("2026-10-02"))).toBe("overdue");
  });
});
