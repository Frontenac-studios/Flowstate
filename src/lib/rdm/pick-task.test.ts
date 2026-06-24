import { describe, expect, it, vi } from "vitest";

import { pickRdmTask, rdmWeight, type PickRdmResult, type RdmPickTask } from "./pick-task";

describe("pickRdmTask", () => {
  it("returns null for an empty pool", () => {
    expect(pickRdmTask([])).toBeNull();
  });

  it("returns null when every task is completed", () => {
    const tasks: RdmPickTask[] = [
      { id: "a", title: "Done A", isTop3: true, completedAt: new Date() },
      { id: "b", title: "Done B", isTop3: false, completedAt: new Date() },
    ];
    expect(pickRdmTask(tasks)).toBeNull();
  });

  it("never returns a completed task from a mixed pool", () => {
    const tasks: RdmPickTask[] = [
      { id: "done", title: "Done", isTop3: true, completedAt: new Date() },
      { id: "open", title: "Open", isTop3: false, completedAt: null },
    ];
    vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const result = pickRdmTask(tasks);
      expect(result?.id).toBe("open");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("returns the only eligible task deterministically", () => {
    const tasks: RdmPickTask[] = [
      { id: "only", title: "Only open", isTop3: false, completedAt: null },
    ];
    expect(pickRdmTask(tasks)).toEqual({
      id: "only",
      title: "Only open",
      isTop3: false,
    } satisfies PickRdmResult);
  });

  it("biases toward non-Top-3 when lastWasLarge is true", () => {
    const tasks: RdmPickTask[] = [
      { id: "top1", title: "Top 1", isTop3: true, completedAt: null },
      { id: "small1", title: "Small 1", isTop3: false, completedAt: null },
      { id: "small2", title: "Small 2", isTop3: false, completedAt: null },
    ];

    // With lastWasLarge=true, weights become [1, 3, 3] (total=7).
    // random=0.2 => roll=1.4 => picks index 1 ("small1").
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    try {
      const result = pickRdmTask(tasks, { lastWasLarge: true });
      expect(result).toEqual({
        id: "small1",
        title: "Small 1",
        isTop3: false,
      } satisfies PickRdmResult);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("biases toward Top-3 when lastWasLarge is false", () => {
    const tasks: RdmPickTask[] = [
      { id: "top1", title: "Top 1", isTop3: true, completedAt: null },
      { id: "small1", title: "Small 1", isTop3: false, completedAt: null },
      { id: "small2", title: "Small 2", isTop3: false, completedAt: null },
    ];

    // With lastWasLarge=false, weights become [3, 1, 1] (total=5).
    // random=0.1 => roll=0.5 => picks index 0 ("top1").
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    try {
      const result = pickRdmTask(tasks, { lastWasLarge: false });
      expect(result).toEqual({
        id: "top1",
        title: "Top 1",
        isTop3: true,
      } satisfies PickRdmResult);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("hard-skips blocked tasks (3.c)", () => {
    const tasks: RdmPickTask[] = [
      { id: "blocked", title: "Blocked", isTop3: true, completedAt: null, isBlocked: true },
      { id: "open", title: "Open", isTop3: false, completedAt: null },
    ];
    vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      expect(pickRdmTask(tasks)?.id).toBe("open");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("returns null when every eligible task is blocked", () => {
    const tasks: RdmPickTask[] = [
      { id: "a", title: "A", isTop3: false, completedAt: null, isBlocked: true },
      { id: "b", title: "B", isTop3: true, completedAt: null, isBlocked: true },
    ];
    expect(pickRdmTask(tasks)).toBeNull();
  });
});

describe("rdmWeight", () => {
  it("returns the base Top-3 interleave weight with no dependents", () => {
    expect(rdmWeight({ isTop3: true }, false)).toBe(3);
    expect(rdmWeight({ isTop3: false }, false)).toBe(1);
    expect(rdmWeight({ isTop3: true }, true)).toBe(1);
    expect(rdmWeight({ isTop3: false }, true)).toBe(3);
  });

  it("scales weight up with unblocksCount", () => {
    // base 1 * (1 + 0.5*2) = 2
    expect(rdmWeight({ isTop3: false, unblocksCount: 2 }, false)).toBe(2);
    // base 3 * (1 + 0.5*1) = 4.5
    expect(rdmWeight({ isTop3: true, unblocksCount: 1 }, false)).toBe(4.5);
  });

  it("caps the dependent bonus at the soft cap", () => {
    // bonus capped at 8 dependents: 1 * (1 + 0.5*8) = 5
    expect(rdmWeight({ isTop3: false, unblocksCount: 99 }, false)).toBe(5);
  });
});
