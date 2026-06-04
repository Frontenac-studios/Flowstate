import { describe, expect, it } from "vitest";

import { buildPhaseTree } from "./phase-tree";
import { defaultMillerPath, expandMillerPath } from "./miller-path";

const phases = [
  { id: "p1", name: "Product", parentPhaseId: null, sortOrder: 0, completedAt: null },
  { id: "p2", name: "Environment", parentPhaseId: "p1", sortOrder: 0, completedAt: null },
  { id: "p3", name: "Design", parentPhaseId: "p1", sortOrder: 1, completedAt: null },
  { id: "p4", name: "Nested", parentPhaseId: "p2", sortOrder: 0, completedAt: null },
] as const;

const tasks = [
  { id: "t1", phaseId: "p2", sortOrder: 0, completedAt: null },
  { id: "t2", phaseId: "p2", sortOrder: 1, completedAt: null },
];

describe("expandMillerPath", () => {
  const tree = buildPhaseTree([...phases], [...tasks]);

  it("returns empty path when input is empty", () => {
    expect(expandMillerPath(tree, [], 5)).toEqual([]);
  });

  it("appends first incomplete child to preserve user prefix", () => {
    expect(expandMillerPath(tree, ["p1"], 3)).toEqual(["p1", "p2"]);
    expect(expandMillerPath(tree, ["p1"], 5)).toEqual(["p1", "p2", "p4"]);
  });

  it("respects maxColumns budget", () => {
    expect(expandMillerPath(tree, ["p1"], 3)).toEqual(["p1", "p2"]);
    expect(expandMillerPath(tree, ["p1", "p2"], 3)).toEqual(["p1", "p2"]);
  });

  it("continues through multiple levels when budget allows", () => {
    expect(expandMillerPath(tree, ["p1", "p2"], 5)).toEqual(["p1", "p2", "p4"]);
  });

  it("does not replace user choice at a level", () => {
    expect(expandMillerPath(tree, ["p1", "p3"], 5)).toEqual(["p1", "p3"]);
  });

  it("prunes invalid tail ids", () => {
    expect(expandMillerPath(tree, ["p1", "missing"], 3)).toEqual(["p1", "p2"]);
  });
});

describe("defaultMillerPath", () => {
  it("returns empty path for an empty tree", () => {
    const tree = buildPhaseTree([], []);
    expect(defaultMillerPath(tree, 5)).toEqual([]);
  });

  it("selects first root and expands through first child per level", () => {
    const tree = buildPhaseTree([...phases], [...tasks]);
    expect(defaultMillerPath(tree, 3)).toEqual(["p1", "p2"]);
    expect(defaultMillerPath(tree, 5)).toEqual(["p1", "p2", "p4"]);
  });
});
