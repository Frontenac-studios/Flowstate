import { describe, expect, it } from "vitest";

import { partitionWeekTasks } from "./partition-week-tasks";

describe("partitionWeekTasks", () => {
  const wed = new Date(2026, 4, 27);

  it("puts null scheduledDate tasks in inbox including later override", () => {
    const result = partitionWeekTasks(
      [
        { id: "a", scheduledDate: null },
        { id: "b", scheduledDate: null },
      ],
      wed
    );

    expect(result.inbox.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("groups in-week dates into columns", () => {
    const result = partitionWeekTasks([{ id: "wed", scheduledDate: "2026-05-27" }], wed);

    expect(result.byDate["2026-05-27"]?.map((t) => t.id)).toEqual(["wed"]);
    expect(result.inbox).toHaveLength(0);
  });

  it("excludes tasks scheduled outside current week", () => {
    const result = partitionWeekTasks([{ id: "next", scheduledDate: "2026-06-02" }], wed);

    expect(result.inbox).toHaveLength(0);
    expect(Object.values(result.byDate).every((col) => col.length === 0)).toBe(true);
  });
});
