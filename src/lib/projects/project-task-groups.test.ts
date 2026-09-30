import { describe, expect, it } from "vitest";

import {
  applyTagFilter,
  cycleTagFilter,
  groupTasksByPhase,
  groupTasksByWeek,
  tagCounts,
  type GroupableTask,
} from "./project-task-groups";

const t = (id: string, over: Partial<GroupableTask> = {}): GroupableTask => ({
  id,
  phaseId: null,
  scheduledDate: null,
  dueDate: null,
  tags: null,
  sortOrder: 0,
  ...over,
});

// Wednesday 30 Sep 2026 — its week runs Mon 28 Sep – Sun 4 Oct.
const today = new Date(2026, 8, 30);

describe("groupTasksByWeek", () => {
  const { groups, undated } = groupTasksByWeek(
    [
      t("late", { scheduledDate: "2026-09-22" }),
      t("now", { scheduledDate: "2026-10-01" }),
      t("due-only", { dueDate: "2026-10-06" }),
      t("far", { scheduledDate: "2026-10-14" }),
      t("none"),
    ],
    today
  );

  it("orders Earlier, This week, Next week, then later ranges", () => {
    expect(groups.map((g) => g.label)).toEqual([
      "Earlier",
      "This week",
      "Next week",
      "Oct 12 – 18",
    ]);
    expect(groups[1]!.sub).toBe("Sep 28 – Oct 4");
  });

  it("dates a task by its planned day, falling back to its deadline", () => {
    expect(groups[2]!.tasks.map((x) => x.id)).toEqual(["due-only"]);
  });

  it("returns undated tasks separately", () => {
    expect(undated.map((x) => x.id)).toEqual(["none"]);
  });
});

describe("groupTasksByPhase", () => {
  const phases = [
    { id: "b", name: "Build", parentPhaseId: null, sortOrder: 1 },
    { id: "d", name: "Design", parentPhaseId: null, sortOrder: 0 },
    { id: "dw", name: "Web", parentPhaseId: "d", sortOrder: 0 },
  ];

  it("groups by top-level phase in plan order, subphase tasks under their root", () => {
    const { groups } = groupTasksByPhase(
      [t("1", { phaseId: "b" }), t("2", { phaseId: "dw" }), t("3")],
      phases
    );
    expect(groups.map((g) => [g.label, g.tasks.map((x) => x.id)])).toEqual([
      ["Design", ["2"]],
      ["Build", ["1"]],
      ["No phase", ["3"]],
    ]);
  });
});

describe("tag filter", () => {
  const tasks = [
    t("a", { tags: ["Client", "in review"] }),
    t("b", { tags: ["client"] }),
    t("c", { tags: ["Admin"] }),
    t("d"),
  ];

  it("cycles off → include → exclude → off", () => {
    let f = cycleTagFilter({}, "Client");
    expect(f).toEqual({ client: "include" });
    f = cycleTagFilter(f, "client");
    expect(f).toEqual({ client: "exclude" });
    expect(cycleTagFilter(f, "CLIENT")).toEqual({});
  });

  it("ORs includes and drops anything excluded", () => {
    expect(applyTagFilter(tasks, { client: "include", admin: "include" }).map((x) => x.id)).toEqual(
      ["a", "b", "c"]
    );
    expect(applyTagFilter(tasks, { "in review": "exclude" }).map((x) => x.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("counts tags case-insensitively, most used first", () => {
    expect(tagCounts(tasks)).toEqual([
      { tag: "Client", count: 2 },
      { tag: "Admin", count: 1 },
      { tag: "in review", count: 1 },
    ]);
  });
});
