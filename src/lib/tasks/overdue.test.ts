import { describe, expect, it } from "vitest";

import { effectiveDueDate, isOverdue } from "./overdue";

const TODAY = "2026-09-29";

describe("effectiveDueDate / isOverdue", () => {
  it("uses the deadline when set", () => {
    expect(effectiveDueDate({ dueDate: "2026-10-02", scheduledDate: "2026-09-20" })).toBe(
      "2026-10-02"
    );
    // Planned day passed, deadline still ahead → not overdue.
    expect(isOverdue({ dueDate: "2026-10-02", scheduledDate: "2026-09-20" }, TODAY)).toBe(false);
    // Deadline passed, planned for later → overdue.
    expect(isOverdue({ dueDate: "2026-09-28", scheduledDate: "2026-10-05" }, TODAY)).toBe(true);
  });

  it("falls back to the planned day without a deadline", () => {
    expect(isOverdue({ dueDate: null, scheduledDate: "2026-09-28" }, TODAY)).toBe(true);
    expect(isOverdue({ scheduledDate: TODAY }, TODAY)).toBe(false);
    expect(isOverdue({}, TODAY)).toBe(false);
  });
});
