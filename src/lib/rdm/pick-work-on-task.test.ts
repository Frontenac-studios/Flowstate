import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeTop3Boost,
  computeWorkOnWeight,
  pickWorkOnTask,
  type WorkOnPickTask,
} from "./pick-work-on-task";

function task(
  overrides: Partial<WorkOnPickTask> & Pick<WorkOnPickTask, "id" | "title">
): WorkOnPickTask {
  return {
    isTop3: false,
    priority: 0,
    top3Order: null,
    completedAt: null,
    ...overrides,
  };
}

const DAY = { dayStartHour: 7, dayEndHour: 19, localHour: 10 };

describe("computeTop3Boost", () => {
  it("returns 1.5 at day start", () => {
    expect(computeTop3Boost(7, 7, 19)).toBe(1.5);
  });

  it("returns 4.0 at day end", () => {
    expect(computeTop3Boost(19, 7, 19)).toBe(4);
  });

  it("returns 4.0 after day end", () => {
    expect(computeTop3Boost(22, 7, 19)).toBe(4);
  });
});

describe("pickWorkOnTask", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns null for an empty pool", () => {
    expect(pickWorkOnTask([], DAY)).toEqual({ pick: null, stalledTop3: [] });
  });

  it("returns null when every task is completed", () => {
    const tasks = [task({ id: "a", title: "Done", completedAt: new Date() })];
    expect(pickWorkOnTask(tasks, DAY)).toEqual({ pick: null, stalledTop3: [] });
  });

  it("returns the only eligible task deterministically", () => {
    const tasks = [task({ id: "only", title: "Only open" })];
    expect(pickWorkOnTask(tasks, DAY).pick).toEqual({
      id: "only",
      title: "Only open",
      isTop3: false,
      pickReason: "next on your list",
    });
  });

  it("works with no Top 3 tasks", () => {
    const tasks = [
      task({ id: "a", title: "A", priority: 1 }),
      task({ id: "b", title: "B", priority: 0 }),
    ];
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = pickWorkOnTask(tasks, DAY);
    expect(result.pick?.id).toBe("a");
  });

  it("biases toward Top 3 in the morning when lastWasLarge is false", () => {
    const tasks = [
      task({ id: "top1", title: "Top 1", isTop3: true, top3Order: 1 }),
      task({ id: "small1", title: "Small 1" }),
      task({ id: "small2", title: "Small 2" }),
    ];

    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const result = pickWorkOnTask(tasks, { ...DAY, localHour: 8, lastWasLarge: false });
    expect(result.pick?.id).toBe("top1");
  });

  it("biases toward non-Top-3 when lastWasLarge is true", () => {
    const tasks = [
      task({ id: "top1", title: "Top 1", isTop3: true, top3Order: 1 }),
      task({ id: "small1", title: "Small 1" }),
      task({ id: "small2", title: "Small 2" }),
    ];

    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = pickWorkOnTask(tasks, { ...DAY, localHour: 8, lastWasLarge: true });
    expect(result.pick?.isTop3).toBe(false);
  });

  it("gives higher afternoon weight to Top 3 than morning", () => {
    const top3 = task({ id: "top1", title: "Top 1", isTop3: true, top3Order: 1 });
    const small = task({ id: "small1", title: "Small 1" });

    const morningWeight = computeWorkOnWeight(top3, { ...DAY, localHour: 8 }, new Set());
    const afternoonWeight = computeWorkOnWeight(top3, { ...DAY, localHour: 17 }, new Set());
    const morningSmall = computeWorkOnWeight(small, { ...DAY, localHour: 8 }, new Set());
    const afternoonSmall = computeWorkOnWeight(small, { ...DAY, localHour: 17 }, new Set());

    expect(afternoonWeight / morningWeight).toBeGreaterThan(1);
    expect(afternoonSmall).toBe(morningSmall);
  });

  it("boosts stalled Top 3 after nudge threshold hour", () => {
    vi.stubEnv("NUDGE_DEBUG_HOUR", "14");

    const stalled = task({ id: "top1", title: "Top 1", isTop3: true, top3Order: 1 });
    const stalledIds = new Set(["top1"]);

    const beforeNudge = computeWorkOnWeight(stalled, { ...DAY, localHour: 10 }, stalledIds);
    const afterNudge = computeWorkOnWeight(stalled, { ...DAY, localHour: 15 }, stalledIds);

    expect(afterNudge).toBeGreaterThan(beforeNudge);
  });

  it("returns stalledTop3 metadata passthrough", () => {
    const stalled = [{ id: "top1", title: "Top 1", top3Order: 1 }];
    const result = pickWorkOnTask([task({ id: "top1", title: "Top 1", isTop3: true })], {
      ...DAY,
      stalledTop3: stalled,
    });
    expect(result.stalledTop3).toEqual(stalled);
  });
});
