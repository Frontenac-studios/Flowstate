import { describe, expect, it } from "vitest";

import { findPhaseAmongSiblings, findPhaseByName } from "./find-phase-by-name";

const phases = [
  { id: "p1", name: "Design", parentPhaseId: null },
  { id: "p2", name: "Build", parentPhaseId: null },
  { id: "p3", name: "Design", parentPhaseId: "p2" },
];

const ambiguousPhases = [
  { id: "p1", name: "Design", parentPhaseId: null },
  { id: "p2", name: "design", parentPhaseId: null },
];

describe("findPhaseByName", () => {
  it("finds a phase case-insensitively", () => {
    expect(findPhaseByName(phases.slice(0, 2), "Design")).toEqual({ kind: "found", phaseId: "p1" });
    expect(findPhaseByName(phases.slice(0, 2), "build")).toEqual({ kind: "found", phaseId: "p2" });
  });

  it("reports ambiguous matches", () => {
    expect(findPhaseByName(ambiguousPhases, "design")).toEqual({
      kind: "ambiguous",
      names: ["Design", "design"],
    });
  });

  it("returns not_found for unknown or blank names", () => {
    expect(findPhaseByName(phases, "QA")).toEqual({ kind: "not_found" });
    expect(findPhaseByName(phases, "  ")).toEqual({ kind: "not_found" });
  });
});

describe("findPhaseAmongSiblings", () => {
  it("finds only among phases with the same parent", () => {
    expect(findPhaseAmongSiblings(phases, "Design", null)).toEqual({
      kind: "found",
      phaseId: "p1",
    });
    expect(findPhaseAmongSiblings(phases, "Design", "p2")).toEqual({
      kind: "found",
      phaseId: "p3",
    });
    expect(findPhaseAmongSiblings(phases, "Design", "p1")).toEqual({ kind: "not_found" });
  });
});
