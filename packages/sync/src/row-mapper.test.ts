import { describe, expect, it } from "vitest";

import { mapPayloadToRemote, mapRemoteRow } from "./row-mapper";

describe("row-mapper", () => {
  it("maps day_reviews date field", () => {
    const mapped = mapRemoteRow("day_reviews", {
      id: "1",
      user_id: "u",
      date: "2026-05-27",
      created_at: "2026-05-27T00:00:00Z",
      updated_at: "2026-05-27T00:00:00Z",
    });
    expect(mapped.reviewDate).toBe("2026-05-27");
  });

  it("stringifies nudge_events task_ids and drops snake_case key", () => {
    const mapped = mapRemoteRow("nudge_events", {
      id: "n1",
      user_id: "u",
      kind: "top3_stall",
      local_date: "2026-05-27",
      task_ids: '["a","b"]',
      created_at: "2026-05-27T00:00:00Z",
      updated_at: "2026-05-27T00:00:00Z",
    });
    expect(mapped.taskIds).toBe('["a","b"]');
    expect(mapped).not.toHaveProperty("task_ids");
  });

  it("maps task payload to remote snake_case", () => {
    const remote = mapPayloadToRemote("tasks", {
      id: "t1",
      userId: "u1",
      title: "Test",
      isTop3: 1,
    });
    expect(remote.is_top_3).toBe(true);
    expect(remote.user_id).toBe("u1");
  });

  it("round-trips task category fields between remote and local shapes", () => {
    // remote (Postgres) -> local (SQLite): boolean becomes 0/1, enum stays text
    const local = mapRemoteRow("tasks", {
      id: "t1",
      user_id: "u1",
      title: "Call mom",
      category: "relationships",
      category_unresolved: false,
      is_top_3: true,
      created_at: "2026-06-16T00:00:00Z",
      updated_at: "2026-06-16T00:00:00Z",
    });
    expect(local.category).toBe("relationships");
    expect(local.categoryUnresolved).toBe(0);

    // local (SQLite) -> remote (Postgres): 0/1 becomes boolean
    const remote = mapPayloadToRemote("tasks", {
      id: "t1",
      userId: "u1",
      category: "relationships",
      categoryUnresolved: 1,
    });
    expect(remote.category).toBe("relationships");
    expect(remote.category_unresolved).toBe(true);
  });
});
