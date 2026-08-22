import { describe, expect, it } from "vitest";

import { validateWeekDraftAssignments } from "./validate-week-draft-assignments";

describe("validateWeekDraftAssignments", () => {
  const wed = new Date(2026, 4, 27);
  const owned = new Set(["a", "b"]);

  it("accepts valid assignments", () => {
    const result = validateWeekDraftAssignments(
      [{ taskId: "a", scheduledDate: "2026-05-27" }],
      owned,
      wed
    );
    expect(result.ok).toBe(true);
  });

  it("rejects unknown task", () => {
    const result = validateWeekDraftAssignments(
      [{ taskId: "x", scheduledDate: "2026-05-27" }],
      owned,
      wed
    );
    expect(result).toEqual({ ok: false, error: "UNKNOWN_TASK" });
  });

  it("rejects duplicate task ids", () => {
    const result = validateWeekDraftAssignments(
      [
        { taskId: "a", scheduledDate: "2026-05-27" },
        { taskId: "a", scheduledDate: "2026-05-28" },
      ],
      owned,
      wed
    );
    expect(result).toEqual({ ok: false, error: "DUPLICATE_TASK" });
  });

  it("rejects dates outside the week", () => {
    const result = validateWeekDraftAssignments(
      [{ taskId: "a", scheduledDate: "2026-06-02" }],
      owned,
      wed
    );
    expect(result).toEqual({ ok: false, error: "DATE_OUT_OF_WEEK" });
  });

  it("rejects assignments that over-fill a day with protected blocks", () => {
    const result = validateWeekDraftAssignments(
      [
        { taskId: "a", scheduledDate: "2026-05-27" },
        { taskId: "b", scheduledDate: "2026-05-27" },
      ],
      owned,
      wed,
      {
        protectedCountByDate: { "2026-05-27": 8 },
        existingTasksByDate: {},
        priorityTaskIdsByDate: {},
        taskWeightById: { a: 1, b: 1 },
        overCommitThreshold: 9,
      }
    );
    expect(result).toEqual({ ok: false, error: "DAY_OVER_CAPACITY" });
  });
});
