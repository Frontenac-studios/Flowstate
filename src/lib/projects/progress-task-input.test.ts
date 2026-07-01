import { describe, expect, it } from "vitest";
import { weightedProgressForTasks } from "./progress-task-input";

describe("weightedProgressForTasks", () => {
  it("weights Top-3 tasks at 3x", () => {
    expect(
      weightedProgressForTasks(
        [
          { id: "t1", isTop3: true, completedAt: new Date() },
          { id: "t2", isTop3: false, completedAt: null },
          { id: "t3", isTop3: false, completedAt: null },
        ],
        new Set()
      )
    ).toEqual({ percent: 60, completedWeight: 3, totalWeight: 5 });
  });
});
