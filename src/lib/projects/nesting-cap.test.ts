import { describe, expect, it } from "vitest";

import { assertPhaseNestAllowed, phaseDepth } from "./nesting-cap";

const phases = [
  { id: "root", parentPhaseId: null },
  { id: "mid", parentPhaseId: "root" },
  { id: "leaf", parentPhaseId: "mid" },
];

describe("phaseDepth", () => {
  it("counts ancestors for arbitrary depth", () => {
    expect(phaseDepth("root", phases)).toBe(1);
    expect(phaseDepth("mid", phases)).toBe(2);
    expect(phaseDepth("leaf", phases)).toBe(3);
  });

  it("returns null for unknown or cyclic chains", () => {
    expect(phaseDepth("missing", phases)).toBeNull();
    expect(
      phaseDepth("a", [
        { id: "a", parentPhaseId: "b" },
        { id: "b", parentPhaseId: "a" },
      ])
    ).toBeNull();
  });
});

describe("assertPhaseNestAllowed", () => {
  it("allows nesting under any existing parent (unlimited depth)", () => {
    expect(() => assertPhaseNestAllowed("leaf", phases)).not.toThrow();
    expect(() => assertPhaseNestAllowed(null, phases)).not.toThrow();
  });

  it("rejects an unknown parent", () => {
    expect(() => assertPhaseNestAllowed("missing", phases)).toThrow(/Parent phase not found/);
  });
});
