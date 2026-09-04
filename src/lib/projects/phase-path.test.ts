import { describe, expect, it } from "vitest";

import { phasePathForTask, type PhaseAncestry } from "./phase-path";

const phases: PhaseAncestry[] = [
  { id: "discovery", parentPhaseId: null },
  { id: "interviews", parentPhaseId: "discovery" },
  { id: "round-two", parentPhaseId: "interviews" },
  { id: "build", parentPhaseId: null },
];

describe("phasePathForTask", () => {
  it("walks from the root down to the task's phase", () => {
    expect(phasePathForTask(phases, "round-two")).toEqual(["discovery", "interviews", "round-two"]);
  });

  it("returns a single-phase path for a top-level phase", () => {
    expect(phasePathForTask(phases, "build")).toEqual(["build"]);
  });

  it("puts a loose task at the project root", () => {
    expect(phasePathForTask(phases, null)).toEqual([]);
  });

  it("survives a phase whose parent is missing rather than returning nothing", () => {
    const orphan: PhaseAncestry[] = [{ id: "stray", parentPhaseId: "deleted" }];
    expect(phasePathForTask(orphan, "stray")).toEqual(["stray"]);
  });

  it("does not loop forever on a cycle", () => {
    const cyclic: PhaseAncestry[] = [
      { id: "a", parentPhaseId: "b" },
      { id: "b", parentPhaseId: "a" },
    ];
    expect(phasePathForTask(cyclic, "a")).toEqual(["b", "a"]);
  });
});
