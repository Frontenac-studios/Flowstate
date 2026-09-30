import { describe, expect, it } from "vitest";

import { buildPhaseTree } from "./phase-tree";
import {
  buildTimelineRows,
  maxPhaseDepth,
  taskMark,
  unplannedPhases,
  type TimelinePhase,
  type TimelineTask,
} from "./timeline-rows";

const today = "2026-09-30";
const phase = (id: string, parent: string | null, sort: number, dates?: [string, string]) =>
  ({
    id,
    parentPhaseId: parent,
    sortOrder: sort,
    name: id,
    startDate: dates?.[0] ?? null,
    endDate: dates?.[1] ?? null,
  }) satisfies TimelinePhase;
const task = (id: string, phaseId: string | null, over: Partial<TimelineTask> = {}) =>
  ({
    id,
    title: id,
    phaseId,
    sortOrder: 0,
    scheduledDate: null,
    dueDate: null,
    completedAt: null,
    ...over,
  }) satisfies TimelineTask;

const phases = [
  phase("Design", null, 0, ["2026-09-01", "2026-10-10"]),
  phase("Brand", "Design", 0, ["2026-09-01", "2026-09-20"]),
  phase("Logo", "Brand", 0, ["2026-09-01", "2026-09-10"]),
  phase("Launch", null, 1),
];
const tasks = [
  task("moodboard", "Brand", { scheduledDate: "2026-09-05", completedAt: new Date() }),
  task("specimens", "Logo", { dueDate: "2026-09-25" }),
  task("review", "Design", { scheduledDate: "2026-09-28", dueDate: "2026-09-30" }),
];
const tree = buildPhaseTree(phases, tasks);

describe("taskMark", () => {
  it("spans planned day to deadline and flags overdue / due today / done", () => {
    expect(taskMark(tasks[2]!, today)).toEqual({
      start: "2026-09-28",
      end: "2026-09-30",
      status: "today",
    });
    expect(taskMark(tasks[1]!, today)?.status).toBe("overdue");
    expect(taskMark(tasks[0]!, today)?.status).toBe("done");
    expect(taskMark(task("x", null), today)).toBeNull();
  });
});

describe("buildTimelineRows", () => {
  it("shows top-level phases collapsed, unplanned ones flagged", () => {
    const rows = buildTimelineRows({ tree, expanded: new Set(), windowTop: 1, todayIso: today });
    expect(rows.map((r) => (r.kind === "phase" ? `${r.name}:${r.planned}` : r.kind))).toEqual([
      "Design:true",
      "Launch:false",
    ]);
  });

  it("expands a top row into child phases then its own tasks, and a child into all its tasks", () => {
    const rows = buildTimelineRows({
      tree,
      expanded: new Set(["Design", "Brand"]),
      windowTop: 1,
      todayIso: today,
    });
    expect(rows.map((r) => r.key)).toEqual([
      "phase:Design",
      "phase:Brand",
      "task:moodboard",
      "task:specimens",
      "task:review",
      "phase:Launch",
    ]);
    const design = rows[0]!;
    expect(design.kind === "phase" && [design.done, design.total]).toEqual([1, 3]);
  });

  it("turns the level above the window into a section header (DepthB)", () => {
    const rows = buildTimelineRows({ tree, expanded: new Set(), windowTop: 2, todayIso: today });
    expect(rows.map((r) => (r.kind === "section" ? `§${r.label}` : r.key))).toEqual([
      "§Design",
      "phase:Brand",
    ]);
  });
});

describe("tree helpers", () => {
  it("measures depth and lists unplanned phases at the window top", () => {
    expect(maxPhaseDepth(tree)).toBe(3);
    expect(unplannedPhases(tree, 1)).toEqual([{ id: "Launch", name: "Launch", taskCount: 0 }]);
  });
});
