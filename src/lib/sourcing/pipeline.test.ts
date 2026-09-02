import { describe, expect, it } from "vitest";

import {
  CLOSED_STAGES,
  OPEN_STAGES,
  PIPELINE_STAGES,
  PROMOTES_AT,
  funnelCounts,
  groupByStage,
  isClosedStage,
  isOpenStage,
  nextStage,
  previousStage,
  stageDepth,
  stagePromotes,
  stageTakesProposal,
} from "./pipeline";

describe("pipeline stages", () => {
  it("orders the funnel Sourced → Signed", () => {
    expect([...PIPELINE_STAGES]).toEqual(["new", "contacted", "engaged", "proposal", "signed"]);
    expect(stageDepth("new")).toBe(0);
    expect(stageDepth("signed")).toBe(4);
  });

  it("reports -1 for a state that is not a stage", () => {
    expect(stageDepth("dismissed")).toBe(-1);
    expect(stageDepth("snoozed")).toBe(-1);
  });

  it("walks forward and back, and stops at both ends", () => {
    expect(nextStage("new")).toBe("contacted");
    expect(nextStage("proposal")).toBe("signed");
    expect(nextStage("signed")).toBeNull();
    expect(previousStage("contacted")).toBe("new");
    expect(previousStage("new")).toBeNull();
  });

  it("promotes from first contact onward, never at Sourced", () => {
    expect(PROMOTES_AT).toBe("contacted");
    expect(stagePromotes("new")).toBe(false);
    expect(stagePromotes("contacted")).toBe(true);
    expect(stagePromotes("proposal")).toBe(true);
    expect(stagePromotes("signed")).toBe(true);
  });

  it("offers a proposal figure only from the Proposal stage on", () => {
    expect(stageTakesProposal("engaged")).toBe(false);
    expect(stageTakesProposal("proposal")).toBe(true);
    expect(stageTakesProposal("signed")).toBe(true);
  });

  it("treats signed as both the last stage and a closed one", () => {
    expect(isClosedStage("signed")).toBe(true);
    expect(isOpenStage("signed")).toBe(false);
    expect([...CLOSED_STAGES]).toEqual(["signed", "declined", "lost"]);
    // Dismissed/snoozed are triage verbs, not deal outcomes.
    expect(isClosedStage("dismissed")).toBe(false);
    expect(isOpenStage("dismissed")).toBe(false);
  });
});

describe("groupByStage", () => {
  const leads = [
    { id: "c", state: "contacted", rank: 2 },
    { id: "a", state: "new", rank: 1 },
    { id: "b", state: "contacted", rank: 1 },
    { id: "z", state: "signed", rank: 9 },
    { id: "y", state: "dismissed", rank: 8 },
  ];

  it("returns every open column, empty ones included", () => {
    const columns = groupByStage(leads);
    expect(columns.map((c) => c.stage)).toEqual([...OPEN_STAGES]);
    expect(columns.find((c) => c.stage === "proposal")!.leads).toEqual([]);
  });

  it("ranks within a column", () => {
    const contacted = groupByStage(leads).find((c) => c.stage === "contacted")!;
    expect(contacted.leads.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("keeps closed and triaged leads off the board", () => {
    const onBoard = groupByStage(leads).flatMap((c) => c.leads.map((l) => l.id));
    expect(onBoard).not.toContain("z");
    expect(onBoard).not.toContain("y");
  });

  it("does not mutate the input order", () => {
    const input = [
      { id: "c", state: "contacted", rank: 2 },
      { id: "b", state: "contacted", rank: 1 },
    ];
    groupByStage(input);
    expect(input.map((l) => l.id)).toEqual(["c", "b"]);
  });
});

describe("funnelCounts", () => {
  it("counts open deals per stage and ignores everything else", () => {
    expect(
      funnelCounts([
        { id: "a", state: "new", rank: 1 },
        { id: "b", state: "new", rank: 2 },
        { id: "c", state: "proposal", rank: 3 },
        { id: "d", state: "signed", rank: 4 },
        { id: "e", state: "lost", rank: 5 },
      ])
    ).toEqual({ new: 2, contacted: 0, engaged: 0, proposal: 1 });
  });
});
