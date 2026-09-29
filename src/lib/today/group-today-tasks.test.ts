import { describe, expect, it } from "vitest";

import { groupTodayTasks } from "./group-today-tasks";

const TODAY = "2026-09-28";

describe("groupTodayTasks", () => {
  it("splits overdue, today and undated tasks in that order", () => {
    const groups = groupTodayTasks(
      [
        { id: "a", scheduledDate: null },
        { id: "b", scheduledDate: "2026-09-25" },
        { id: "c", scheduledDate: TODAY },
        { id: "d", scheduledDate: "2026-09-27" },
      ],
      TODAY
    );
    expect(groups.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([
      ["overdue", ["b", "d"]],
      ["today", ["c"]],
      ["anytime", ["a"]],
    ]);
  });

  it("drops empty groups", () => {
    expect(groupTodayTasks([{ scheduledDate: null }], TODAY).map((g) => g.key)).toEqual([
      "anytime",
    ]);
    expect(groupTodayTasks([], TODAY)).toEqual([]);
  });
});
