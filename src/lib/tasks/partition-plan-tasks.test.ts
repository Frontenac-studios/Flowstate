import { describe, expect, it } from "vitest";

import { partitionPlanTasks } from "./partition-plan-tasks";

describe("partitionPlanTasks", () => {
  const wed = new Date(2026, 4, 27); // Wed May 27 2026

  it("keeps overdue tasks in Today (not Later)", () => {
    const result = partitionPlanTasks(
      [
        {
          id: "overdue",
          scheduledDate: "2026-05-26",
          bucketOverride: null,
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.today.map((t) => t.id)).toEqual(["overdue"]);
    expect(result.later).toHaveLength(0);
  });

  it("excludes later overrides from Today and partitions them to Later", () => {
    const result = partitionPlanTasks(
      [
        {
          id: "later",
          scheduledDate: null,
          bucketOverride: "later",
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.today).toHaveLength(0);
    expect(result.later.map((t) => t.id)).toEqual(["later"]);
  });

  it("partitions future tasks by derived bucket when not in Today", () => {
    const result = partitionPlanTasks(
      [
        {
          id: "tomorrow",
          scheduledDate: "2026-05-28",
          bucketOverride: null,
          completedAt: null,
        },
        {
          id: "this-week",
          scheduledDate: "2026-05-30",
          bucketOverride: null,
          completedAt: null,
        },
        {
          id: "later",
          scheduledDate: "2026-06-02",
          bucketOverride: null,
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.tomorrow.map((t) => t.id)).toEqual(["tomorrow"]);
    expect(result.thisWeek.map((t) => t.id)).toEqual(["this-week"]);
    expect(result.later.map((t) => t.id)).toEqual(["later"]);
  });
});
