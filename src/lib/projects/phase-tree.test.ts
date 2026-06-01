import { describe, expect, it } from "vitest";

import { buildPhaseTree, derivePhaseRange, partitionByCompletion } from "./phase-tree";

type Phase = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
};

type Task = {
  id: string;
  phaseId: string | null;
  sortOrder: number;
};

function phase(id: string, parentPhaseId: string | null, sortOrder: number, name = id): Phase {
  return { id, parentPhaseId, sortOrder, name };
}

function task(id: string, phaseId: string | null, sortOrder: number): Task {
  return { id, phaseId, sortOrder };
}

describe("buildPhaseTree", () => {
  it("separates loose tasks from phase-attached tasks", () => {
    const tree = buildPhaseTree(
      [phase("p1", null, 0)],
      [task("loose", null, 0), task("t1", "p1", 0)]
    );

    expect(tree.looseTasks.map((t) => t.id)).toEqual(["loose"]);
    expect(tree.rootPhases).toHaveLength(1);
    expect(tree.rootPhases[0].tasks.map((t) => t.id)).toEqual(["t1"]);
  });

  it("nests child phases under their parent at arbitrary depth", () => {
    const tree = buildPhaseTree(
      [phase("p1", null, 0), phase("p2", "p1", 0), phase("p3", "p2", 0)],
      []
    );

    expect(tree.rootPhases.map((n) => n.phase.id)).toEqual(["p1"]);
    expect(tree.rootPhases[0].children.map((n) => n.phase.id)).toEqual(["p2"]);
    expect(tree.rootPhases[0].children[0].children.map((n) => n.phase.id)).toEqual(["p3"]);
  });

  it("sorts phases by sortOrder then name, and tasks by sortOrder", () => {
    const tree = buildPhaseTree(
      [phase("b", null, 0, "Beta"), phase("a", null, 0, "Alpha"), phase("c", null, 1, "Gamma")],
      [task("t2", "a", 5), task("t1", "a", 1)]
    );

    expect(tree.rootPhases.map((n) => n.phase.id)).toEqual(["a", "b", "c"]);
    expect(tree.rootPhases[0].tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("handles an empty project", () => {
    const tree = buildPhaseTree([], []);
    expect(tree.rootPhases).toEqual([]);
    expect(tree.looseTasks).toEqual([]);
  });
});

describe("derivePhaseRange", () => {
  type DatedPhase = Phase & { startDate: string | null; endDate: string | null };

  const dated = (
    id: string,
    parentPhaseId: string | null,
    startDate: string | null,
    endDate: string | null
  ): DatedPhase => ({ id, parentPhaseId, sortOrder: 0, name: id, startDate, endDate });

  it("returns a leaf phase's own dates", () => {
    const tree = buildPhaseTree<DatedPhase, Task>(
      [dated("p1", null, "2026-03-01", "2026-03-10")],
      []
    );
    expect(derivePhaseRange(tree.rootPhases[0])).toEqual({
      start: "2026-03-01",
      end: "2026-03-10",
    });
  });

  it("spans the min start / max end across descendants", () => {
    const tree = buildPhaseTree<DatedPhase, Task>(
      [
        dated("root", null, null, null),
        dated("a", "root", "2026-03-05", "2026-03-08"),
        dated("b", "root", "2026-03-01", "2026-03-20"),
        dated("c", "b", "2026-02-25", "2026-03-15"),
      ],
      []
    );
    expect(derivePhaseRange(tree.rootPhases[0])).toEqual({
      start: "2026-02-25",
      end: "2026-03-20",
    });
  });

  it("returns nulls when no descendant has dates", () => {
    const tree = buildPhaseTree<DatedPhase, Task>(
      [dated("root", null, null, null), dated("a", "root", null, null)],
      []
    );
    expect(derivePhaseRange(tree.rootPhases[0])).toEqual({ start: null, end: null });
  });
});

describe("partitionByCompletion", () => {
  it("splits active from completed, preserving order within each group", () => {
    const items = [
      { id: "a", completedAt: null },
      { id: "b", completedAt: new Date("2026-01-01") },
      { id: "c", completedAt: null },
      { id: "d", completedAt: new Date("2026-02-01") },
    ];
    const { active, completed } = partitionByCompletion(items);
    expect(active.map((i) => i.id)).toEqual(["a", "c"]);
    expect(completed.map((i) => i.id)).toEqual(["b", "d"]);
  });
});
