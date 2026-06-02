import { describe, expect, it } from "vitest";

import { findPhaseByName } from "./find-phase-by-name";

const phases = [
  { id: "p1", name: "Design" },
  { id: "p2", name: "Build" },
];

const ambiguousPhases = [
  { id: "p1", name: "Design" },
  { id: "p2", name: "Build" },
  { id: "p3", name: "design" },
];

describe("findPhaseByName", () => {
  it("returns phase id for exact case-insensitive match when unique", () => {
    expect(findPhaseByName(phases, "Design")).toEqual({ kind: "found", phaseId: "p1" });
    expect(findPhaseByName(phases, "build")).toEqual({ kind: "found", phaseId: "p2" });
  });

  it("returns ambiguous when multiple phases match", () => {
    expect(findPhaseByName(ambiguousPhases, "design")).toEqual({
      kind: "ambiguous",
      names: ["Design", "design"],
    });
  });

  it("returns not_found for unknown or empty name", () => {
    expect(findPhaseByName(phases, "QA")).toEqual({ kind: "not_found" });
    expect(findPhaseByName(phases, "  ")).toEqual({ kind: "not_found" });
  });
});
