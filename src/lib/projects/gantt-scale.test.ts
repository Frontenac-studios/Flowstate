import { describe, expect, it } from "vitest";

import {
  buildTicks,
  computeProjectSpan,
  dayIndex,
  flattenTree,
  offsetToDate,
  pxToDays,
  suggestGranularity,
  totalDays,
} from "./gantt-scale";
import { buildPhaseTree } from "./phase-tree";

type Phase = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
};
type Task = { id: string; phaseId: string | null; sortOrder: number };

function phase(
  id: string,
  parentPhaseId: string | null,
  startDate: string | null,
  endDate: string | null
): Phase {
  return { id, parentPhaseId, sortOrder: 0, name: id, startDate, endDate };
}

describe("dayIndex / offsetToDate / totalDays", () => {
  it("round-trips offsets and dates", () => {
    expect(dayIndex("2026-03-10", "2026-03-01")).toBe(9);
    expect(dayIndex("2026-03-01", "2026-03-01")).toBe(0);
    expect(offsetToDate(9, "2026-03-01")).toBe("2026-03-10");
    expect(offsetToDate(0, "2026-03-01")).toBe("2026-03-01");
  });

  it("counts inclusive days, including across a month boundary", () => {
    expect(totalDays({ start: "2026-03-01", end: "2026-03-01" })).toBe(1);
    expect(totalDays({ start: "2026-03-01", end: "2026-03-10" })).toBe(10);
    expect(totalDays({ start: "2026-02-25", end: "2026-03-02" })).toBe(6);
  });
});

describe("computeProjectSpan", () => {
  it("spans min start / max end across dated phases", () => {
    const tree = buildPhaseTree<Phase, Task>(
      [
        phase("root", null, null, null),
        phase("a", "root", "2026-03-05", "2026-03-08"),
        phase("b", "root", "2026-03-01", "2026-03-20"),
        phase("c", "b", "2026-02-25", "2026-03-15"),
      ],
      []
    );
    expect(computeProjectSpan(tree)).toEqual({ start: "2026-02-25", end: "2026-03-20" });
  });

  it("returns null when nothing is dated", () => {
    const tree = buildPhaseTree<Phase, Task>([phase("a", null, null, null)], []);
    expect(computeProjectSpan(tree)).toBeNull();
  });
});

describe("pxToDays / suggestGranularity", () => {
  it("snaps pixels to whole days", () => {
    expect(pxToDays(50, 20)).toBe(3); // 2.5 → 3
    expect(pxToDays(-60, 20)).toBe(-3);
    expect(pxToDays(100, 0)).toBe(0);
  });

  it("chooses granularity by zoom", () => {
    expect(suggestGranularity(40)).toBe("day");
    expect(suggestGranularity(10)).toBe("week");
    expect(suggestGranularity(3)).toBe("month");
  });
});

describe("buildTicks", () => {
  it("emits one tick per day at day granularity", () => {
    const ticks = buildTicks({ start: "2026-03-01", end: "2026-03-04" }, "day");
    expect(ticks.map((t) => t.dayOffset)).toEqual([0, 1, 2, 3]);
  });

  it("emits month-start ticks (plus the first day) at month granularity", () => {
    const ticks = buildTicks({ start: "2026-02-25", end: "2026-04-02" }, "month");
    expect(ticks.map((t) => t.iso)).toEqual(["2026-02-25", "2026-03-01", "2026-04-01"]);
  });
});

describe("flattenTree", () => {
  it("flattens depth-first with depth and leaf flags", () => {
    const tree = buildPhaseTree<Phase, Task>(
      [phase("p1", null, null, null), phase("p2", "p1", null, null), phase("p3", null, null, null)],
      []
    );
    const rows = flattenTree(tree);
    expect(rows.map((r) => [r.node.phase.id, r.depth, r.isLeaf])).toEqual([
      ["p1", 0, false],
      ["p2", 1, true],
      ["p3", 0, true],
    ]);
  });
});
