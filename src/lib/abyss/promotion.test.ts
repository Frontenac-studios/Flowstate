import { describe, expect, it } from "vitest";

import {
  decodePromotedTarget,
  encodePromotedTarget,
  isTaskLaneTarget,
  scheduledDateForLane,
  selectCameBack,
  type PromotedItemState,
  type SpawnedTaskState,
} from "./promotion";

describe("encodePromotedTarget", () => {
  it("stores task lanes bare", () => {
    expect(encodePromotedTarget("today")).toBe("today");
    expect(encodePromotedTarget("week")).toBe("week");
  });

  it("stores project/goal with the spawned id", () => {
    expect(encodePromotedTarget("project", "p1")).toBe("project:p1");
    expect(encodePromotedTarget("goal", "g1")).toBe("goal:g1");
  });

  it("throws when a non-task target is missing its spawned id", () => {
    expect(() => encodePromotedTarget("project")).toThrow();
    expect(() => encodePromotedTarget("goal")).toThrow();
  });
});

describe("decodePromotedTarget", () => {
  it("round-trips every target", () => {
    expect(decodePromotedTarget("today")).toEqual({ kind: "today" });
    expect(decodePromotedTarget("week")).toEqual({ kind: "week" });
    expect(decodePromotedTarget("project:p1")).toEqual({ kind: "project", id: "p1" });
    expect(decodePromotedTarget("goal:g1")).toEqual({ kind: "goal", id: "g1" });
  });

  it("preserves uuids containing no extra colons", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(decodePromotedTarget(`goal:${id}`)).toEqual({ kind: "goal", id });
  });

  it("returns null for absent or malformed values", () => {
    expect(decodePromotedTarget(null)).toBeNull();
    expect(decodePromotedTarget(undefined)).toBeNull();
    expect(decodePromotedTarget("")).toBeNull();
    expect(decodePromotedTarget("project:")).toBeNull();
    expect(decodePromotedTarget("mystery:x")).toBeNull();
    expect(decodePromotedTarget("nope")).toBeNull();
  });
});

describe("isTaskLaneTarget", () => {
  it("is true only for today/week", () => {
    expect(isTaskLaneTarget("today")).toBe(true);
    expect(isTaskLaneTarget("week")).toBe(true);
    expect(isTaskLaneTarget("project:p1")).toBe(false);
    expect(isTaskLaneTarget("goal:g1")).toBe(false);
    expect(isTaskLaneTarget(null)).toBe(false);
  });
});

describe("scheduledDateForLane", () => {
  it("schedules Today for today", () => {
    // Wed 2026-06-24, mid-week
    const now = new Date("2026-06-24T09:00:00");
    expect(scheduledDateForLane("today", now)).toBe("2026-06-24");
  });

  it("schedules Week for tomorrow when tomorrow is still this ISO week", () => {
    const now = new Date("2026-06-24T09:00:00"); // Wed → Thu next
    expect(scheduledDateForLane("week", now)).toBe("2026-06-25");
  });

  it("clamps Week to the last weekday when tomorrow would spill into next week", () => {
    // Sunday is the last day of the ISO week (Mon–Sun); tomorrow is next Monday.
    const now = new Date("2026-06-28T09:00:00"); // Sunday
    expect(scheduledDateForLane("week", now)).toBe("2026-06-28");
  });
});

describe("selectCameBack", () => {
  const promotedToday = (over: Partial<PromotedItemState> = {}): PromotedItemState => ({
    id: "i1",
    status: "promoted",
    promotedTarget: "today",
    promotedTaskId: "t1",
    ...over,
  });

  const tasks = (...rows: SpawnedTaskState[]) => new Map(rows.map((r) => [r.id, r]));

  it("returns an item whose spawned task is completed", () => {
    const items = [promotedToday()];
    const byId = tasks({ id: "t1", completedAt: new Date("2026-06-20") });
    expect(selectCameBack(items, byId)).toEqual(["i1"]);
  });

  it("keeps an item whose spawned task is still open", () => {
    const items = [promotedToday()];
    const byId = tasks({ id: "t1", completedAt: null });
    expect(selectCameBack(items, byId)).toEqual([]);
  });

  it("returns an item whose task was deleted (FK cleared)", () => {
    const items = [promotedToday({ promotedTaskId: null })];
    expect(selectCameBack(items, tasks())).toEqual(["i1"]);
  });

  it("returns an item whose task id is no longer in the lookup", () => {
    const items = [promotedToday({ promotedTaskId: "gone" })];
    expect(selectCameBack(items, tasks())).toEqual(["i1"]);
  });

  it("ignores active and archived items", () => {
    const items = [
      promotedToday({ id: "a", status: "active", promotedTaskId: null }),
      promotedToday({ id: "b", status: "archived", promotedTaskId: null }),
    ];
    expect(selectCameBack(items, tasks())).toEqual([]);
  });

  it("never auto-returns project/goal promotions", () => {
    const items: PromotedItemState[] = [
      { id: "p", status: "promoted", promotedTarget: "project:p1", promotedTaskId: null },
      { id: "g", status: "promoted", promotedTarget: "goal:g1", promotedTaskId: null },
    ];
    expect(selectCameBack(items, tasks())).toEqual([]);
  });

  it("handles a mixed batch", () => {
    const items: PromotedItemState[] = [
      promotedToday({ id: "done", promotedTaskId: "t-done" }),
      promotedToday({ id: "open", promotedTaskId: "t-open" }),
      promotedToday({ id: "deleted", promotedTaskId: null }),
      { id: "proj", status: "promoted", promotedTarget: "project:x", promotedTaskId: null },
    ];
    const byId = tasks(
      { id: "t-done", completedAt: new Date("2026-06-20") },
      { id: "t-open", completedAt: null }
    );
    expect(selectCameBack(items, byId).sort()).toEqual(["deleted", "done"]);
  });
});
