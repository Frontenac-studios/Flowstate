import { describe, expect, it } from "vitest";

import {
  isScheduleDateInBounds,
  validateScheduleAssignments,
} from "./validate-schedule-assignments";

const NOW = new Date("2026-06-10T12:00:00");

describe("validateScheduleAssignments", () => {
  it("accepts valid owned assignments within bounds", () => {
    const owned = new Set(["a", "b"]);
    const result = validateScheduleAssignments(
      [
        { taskId: "a", scheduledDate: "2026-06-15" },
        { taskId: "b", scheduledDate: "2026-06-16" },
      ],
      owned,
      NOW
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toHaveLength(2);
    }
  });

  it("rejects unknown task ids", () => {
    const result = validateScheduleAssignments(
      [{ taskId: "missing", scheduledDate: "2026-06-15" }],
      new Set(["a"]),
      NOW
    );
    expect(result).toEqual({ ok: false, error: "UNKNOWN_TASK" });
  });

  it("rejects duplicate task ids", () => {
    const result = validateScheduleAssignments(
      [
        { taskId: "a", scheduledDate: "2026-06-15" },
        { taskId: "a", scheduledDate: "2026-06-16" },
      ],
      new Set(["a"]),
      NOW
    );
    expect(result).toEqual({ ok: false, error: "DUPLICATE_TASK" });
  });

  it("rejects dates outside planning window", () => {
    expect(isScheduleDateInBounds("2025-01-01", NOW)).toBe(false);
    expect(isScheduleDateInBounds("2028-01-01", NOW)).toBe(false);
    expect(isScheduleDateInBounds("2026-06-17", NOW)).toBe(true);
  });
});
