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
      applied("body_mind"),
      dismissed("body_mind"),
      dismissed("relationships"),
    ]);
    expect(signal.body_mind).toEqual({ accepted: 1, dismissed: 1 });
    expect(signal.relationships).toEqual({ accepted: 0, dismissed: 1 });
    expect(signal.professional).toEqual({ accepted: 0, dismissed: 0 });
  });

  it("counts a proposal once per distinct category", () => {
    const signal = deriveCategorySignal([dismissed("body_mind", "body_mind", "relationships")]);
    expect(signal.body_mind.dismissed).toBe(1);
    expect(signal.relationships.dismissed).toBe(1);
  });

  it("ignores pending proposals", () => {
    const signal = deriveCategorySignal([{ status: "pending", categories: ["body_mind"] }]);
    expect(signal.body_mind).toEqual({ accepted: 0, dismissed: 0 });
  });

  it("ignores untagged proposals (empty category list)", () => {
    const signal = deriveCategorySignal([dismissed()]);
    expect(signal.body_mind.dismissed).toBe(0);
  });
});

describe("detectEaseOffCandidates", () => {
  const threeSkips = Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () =>
    dismissed("body_mind")
  );

  it("surfaces a category skipped at the threshold with no accepts", () => {
    const signal = deriveCategorySignal(threeSkips);
    expect(detectEaseOffCandidates(signal, [])).toEqual(["body_mind"]);
  });

  it("stays quiet below the threshold", () => {
    const signal = deriveCategorySignal(threeSkips.slice(0, EASE_OFF_DISMISS_THRESHOLD - 1));
    expect(detectEaseOffCandidates(signal, [])).toEqual([]);
  });

  it("stays quiet if the category was ever accepted", () => {
    const signal = deriveCategorySignal([...threeSkips, applied("body_mind")]);
    expect(detectEaseOffCandidates(signal, [])).toEqual([]);
  });

  it("does not re-surface an already-eased category", () => {
    const signal = deriveCategorySignal(threeSkips);
    expect(detectEaseOffCandidates(signal, ["body_mind"])).toEqual([]);
  });

  it("returns candidates in canonical category order", () => {
    const signal = deriveCategorySignal([
      ...Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () => dismissed("adulting")),
      ...Array.from({ length: EASE_OFF_DISMISS_THRESHOLD }, () => dismissed("relationships")),
    ]);
    expect(detectEaseOffCandidates(signal, [])).toEqual(["relationships", "adulting"]);
  });
});

describe("mergeEased", () => {
  it("adds eased categories and de-duplicates", () => {
    expect(mergeEased(["body_mind"], ["body_mind", "adulting"])).toEqual(["body_mind", "adulting"]);
  });

  it("removes resumed categories", () => {
    expect(mergeEased(["body_mind", "adulting"], [], ["body_mind"])).toEqual(["adulting"]);
  });

  it("lets resume win over ease-off in the same call", () => {
    expect(mergeEased([], ["body_mind"], ["body_mind"])).toEqual([]);
  });

  it("returns canonical order regardless of input order", () => {
    expect(mergeEased(["adulting"], ["professional"])).toEqual(["professional", "adulting"]);
  });
});
