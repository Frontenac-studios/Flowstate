import { describe, expect, it } from "vitest";

import {
  deriveCategorySignal,
  detectEaseOffCandidates,
  EASE_OFF_DISMISS_THRESHOLD,
  mergeEased,
  type GoalProposalOutcome,
} from "./goal-coach-signal";

const dismissed = (...categories: GoalProposalOutcome["categories"]): GoalProposalOutcome => ({
  status: "dismissed",
  categories,
});
const applied = (...categories: GoalProposalOutcome["categories"]): GoalProposalOutcome => ({
  status: "applied",
  categories,
});

describe("deriveCategorySignal", () => {
  it("tallies accepted and dismissed per category", () => {
    const signal = deriveCategorySignal([
      applied("personal"),
      dismissed("personal"),
      dismissed("business"),
    ]);
    expect(signal.personal).toEqual({ accepted: 1, dismissed: 1 });
    expect(signal.business).toEqual({ accepted: 0, dismissed: 1 });
  });

  it("counts a proposal once per distinct category", () => {
    const signal = deriveCategorySignal([dismissed("personal", "personal", "business")]);
    expect(signal.personal.dismissed).toBe(1);
    expect(signal.business.dismissed).toBe(1);
  });

  it("ignores pending proposals", () => {
    const signal = deriveCategorySignal([{ status: "pending", categories: ["personal"] }]);
    expect(signal.personal).toEqual({ accepted: 0, dismissed: 0 });
  });

  it("ignores untagged proposals (empty category list)", () => {
    const signal = deriveCategorySignal([dismissed()]);
    expect(signal.personal.dismissed).toBe(0);
  });
});

describe("detectEaseOffCandidates", () => {
  const threeSkips = Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () =>
    dismissed("personal")
  );

  it("surfaces a category skipped at the threshold with no accepts", () => {
    const signal = deriveCategorySignal(threeSkips);
    expect(detectEaseOffCandidates(signal, [])).toEqual(["personal"]);
  });

  it("stays quiet below the threshold", () => {
    const signal = deriveCategorySignal(threeSkips.slice(0, EASE_OFF_DISMISS_THRESHOLD - 1));
    expect(detectEaseOffCandidates(signal, [])).toEqual([]);
  });

  it("stays quiet if the category was ever accepted", () => {
    const signal = deriveCategorySignal([...threeSkips, applied("personal")]);
    expect(detectEaseOffCandidates(signal, [])).toEqual([]);
  });

  it("does not re-surface an already-eased category", () => {
    const signal = deriveCategorySignal(threeSkips);
    expect(detectEaseOffCandidates(signal, ["personal"])).toEqual([]);
  });

  it("returns candidates in canonical category order", () => {
    const signal = deriveCategorySignal([
      ...Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () => dismissed("personal")),
      ...Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () => dismissed("business")),
    ]);
    expect(detectEaseOffCandidates(signal, [])).toEqual(["business", "personal"]);
  });
});

describe("mergeEased", () => {
  it("adds eased categories and de-duplicates", () => {
    expect(mergeEased(["personal"], ["personal", "business"])).toEqual(["business", "personal"]);
  });

  it("removes resumed categories", () => {
    expect(mergeEased(["business", "personal"], [], ["personal"])).toEqual(["business"]);
  });

  it("lets resume win over ease-off in the same call", () => {
    expect(mergeEased([], ["personal"], ["personal"])).toEqual([]);
  });

  it("returns canonical order regardless of input order", () => {
    expect(mergeEased(["personal"], ["business"])).toEqual(["business", "personal"]);
  });
});
