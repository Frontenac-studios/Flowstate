import { describe, expect, it } from "vitest";
import { buildMultiProjectCalendarRows } from "./multi-project-calendar";

describe("buildMultiProjectCalendarRows", () => {
  it("merges spans across projects", () => {
    const { span, rows } = buildMultiProjectCalendarRows(
      [
        { id: "p1", name: "A", category: "professional" },
        { id: "p2", name: "B", category: "adulting" },
      ],
      [
        {
          id: "ph1",
          projectId: "p1",
          parentPhaseId: null,
          sortOrder: 0,
          name: "Plan",
          startDate: "2026-06-01",
          endDate: "2026-06-07",
          completedAt: null,
        },
        {
          id: "ph2",
          projectId: "p2",
          parentPhaseId: null,
          sortOrder: 0,
          name: "Build",
          startDate: "2026-06-10",
          endDate: "2026-06-14",
          completedAt: null,
        },
      ],
      []
    );
    expect(span).toEqual({ start: "2026-06-01", end: "2026-06-14" });
    expect(rows).toHaveLength(2);
  });
});
