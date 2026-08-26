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

  it("passes chat_messages content through as an object (json-mode column serializes)", () => {
    const content = { type: "text", text: "hi" };
    const mapped = mapRemoteRow("chat_messages", {
      id: "c1",
      user_id: "u",
      thread_id: "global",
      role: "assistant",
      content,
      created_at: "2026-05-27T00:00:00Z",
      updated_at: "2026-05-27T00:00:00Z",
    });
    // Must stay an object — the local column is json-mode and stringifies on write.
    // Pre-stringifying here would double-encode the value.
    expect(mapped.content).toEqual(content);
    expect(typeof mapped.content).toBe("object");
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

  it("keeps tasks.suggested_scheduled_date a plain date string (not a Date) round-trip", () => {
    const local = mapRemoteRow("tasks", {
      id: "t1",
      user_id: "u1",
      title: "Ship deck",
      category: "professional",
      scheduled_date: null,
      bucket_override: "later",
      suggested_scheduled_date: "2026-07-10",
      created_at: "2026-07-07T00:00:00Z",
      updated_at: "2026-07-07T00:00:00Z",
    });
    expect(local.suggestedScheduledDate).toBe("2026-07-10");
    expect(local).not.toHaveProperty("suggested_scheduled_date");

    const remote = mapPayloadToRemote("tasks", {
      id: "t1",
      userId: "u1",
      suggestedScheduledDate: "2026-07-10",
    });
    expect(remote.suggested_scheduled_date).toBe("2026-07-10");
  });
});
