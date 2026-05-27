import { describe, expect, it } from "vitest";

import { buildTop3Status } from "./build-top3-status";

describe("buildTop3Status", () => {
  it("returns three slots with empty when unassigned", () => {
    const result = buildTop3Status([]);
    expect(result.slots).toHaveLength(3);
    expect(result.slots.every((s) => s.status === "empty")).toBe(true);
  });

  it("marks completed tasks as done", () => {
    const result = buildTop3Status([
      {
        id: "a",
        title: "Ship",
        top3Order: 1,
        completedAt: new Date(),
      },
    ]);
    expect(result.slots[0]).toMatchObject({ order: 1, status: "done", title: "Ship" });
    expect(result.slots[1]?.status).toBe("empty");
  });

  it("marks incomplete pinned tasks", () => {
    const result = buildTop3Status([
      {
        id: "b",
        title: "Write",
        top3Order: 2,
        completedAt: null,
      },
    ]);
    expect(result.slots[1]).toMatchObject({ status: "incomplete", title: "Write" });
  });
});
