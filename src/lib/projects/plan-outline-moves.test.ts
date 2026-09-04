import { describe, expect, it } from "vitest";

import type { PlanOutlineRow } from "./flatten-plan-outline";
import { nextSortOrder, resolveIndent, resolveOutdent } from "./plan-outline-moves";

function phase(id: string, depth: number, parentPhaseId: string | null): PlanOutlineRow {
  return {
    kind: "phase",
    id,
    depth,
    parentPhaseId,
    title: id,
    completed: false,
    due: null,
    estimateHours: null,
    actualHours: null,
    hot: false,
  };
}

function task(id: string, depth: number, parentPhaseId: string | null): PlanOutlineRow {
  return { ...phase(id, depth, parentPhaseId), kind: "task" };
}

// p1
//   t1
//   p1a
//     t2
// p2
//   t3
// t4  (loose)
const ROWS: PlanOutlineRow[] = [
  phase("p1", 0, null),
  task("t1", 1, "p1"),
  phase("p1a", 1, "p1"),
  task("t2", 2, "p1a"),
  phase("p2", 0, null),
  task("t3", 1, "p2"),
  task("t4", 0, null),
];

const at = (id: string) => ROWS.findIndex((r) => r.id === id);

describe("resolveIndent", () => {
  it("moves a phase under the phase above it at the same depth", () => {
    expect(resolveIndent(ROWS, at("p2"))).toEqual({
      kind: "phase",
      id: "p2",
      parentPhaseId: "p1",
    });
  });

  it("moves a task into a sibling-level phase that precedes it", () => {
    // t1 sits at depth 1 alongside p1a, but p1a comes after it, so there is nothing
    // above at its own depth to move into.
    expect(resolveIndent(ROWS, at("t1"))).toBeNull();
    // t3 has p2 above it only at a shallower depth, so likewise no move.
    expect(resolveIndent(ROWS, at("t3"))).toBeNull();
  });

  it("moves a loose task into the last root phase above it", () => {
    expect(resolveIndent(ROWS, at("t4"))).toEqual({
      kind: "task",
      id: "t4",
      phaseId: "p2",
    });
  });

  it("is a no-op for the first row", () => {
    expect(resolveIndent(ROWS, at("p1"))).toBeNull();
  });

  it("never adopts a row from inside its own subtree", () => {
    // p1a's only same-depth predecessor is t1, which is a task, so no phase parent
    // is found and nothing moves — p1a can never end up under t2.
    expect(resolveIndent(ROWS, at("p1a"))).toBeNull();
  });
});

describe("resolveOutdent", () => {
  it("lifts a sub-phase to its grandparent", () => {
    expect(resolveOutdent(ROWS, at("p1a"))).toEqual({
      kind: "phase",
      id: "p1a",
      parentPhaseId: null,
    });
  });

  it("lifts a nested task into the parent phase", () => {
    expect(resolveOutdent(ROWS, at("t2"))).toEqual({
      kind: "task",
      id: "t2",
      phaseId: "p1",
    });
  });

  it("turns a task in a root phase into a loose project task", () => {
    expect(resolveOutdent(ROWS, at("t1"))).toEqual({
      kind: "task",
      id: "t1",
      phaseId: null,
    });
  });

  it("is a no-op at depth 0", () => {
    expect(resolveOutdent(ROWS, at("p1"))).toBeNull();
    expect(resolveOutdent(ROWS, at("t4"))).toBeNull();
  });
});

describe("nextSortOrder", () => {
  it("counts existing siblings of the same kind, excluding the row being moved", () => {
    expect(nextSortOrder(ROWS, "phase", null, "p2")).toBe(1);
    expect(nextSortOrder(ROWS, "task", "p1", "t4")).toBe(1);
    expect(nextSortOrder(ROWS, "task", "p1a", "t4")).toBe(1);
  });

  it("returns 0 when the destination has no siblings of that kind", () => {
    expect(nextSortOrder(ROWS, "phase", "p2", "p1a")).toBe(0);
  });
});
