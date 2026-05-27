import { describe, expect, it, vi } from "vitest";

import { pickRdmTask, type PickRdmResult, type RdmPickTask } from "./pick-task";

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
});
