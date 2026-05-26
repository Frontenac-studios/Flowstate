import { describe, expect, it } from "vitest";

import { matchesTodayList } from "./matches-today-list";

describe("matchesTodayList", () => {
  const todayIso = "2026-05-27";

  it("includes incomplete tasks with null scheduled date", () => {
    expect(
      matchesTodayList({ scheduledDate: null, bucketOverride: null, completedAt: null }, todayIso)
    ).toBe(true);
  });

  it("includes tasks scheduled today or earlier", () => {
    expect(
      matchesTodayList(
        { scheduledDate: "2026-05-27", bucketOverride: null, completedAt: null },
        todayIso
      )
    ).toBe(true);
    expect(
      matchesTodayList(
        { scheduledDate: "2026-05-26", bucketOverride: null, completedAt: null },
        todayIso
      )
    ).toBe(true);
  });

  it("excludes completed tasks", () => {
    expect(
      matchesTodayList(
        { scheduledDate: null, bucketOverride: null, completedAt: new Date() },
        todayIso
      )
    ).toBe(false);
  });

  it("excludes later bucket override", () => {
    expect(
      matchesTodayList(
        { scheduledDate: null, bucketOverride: "later", completedAt: null },
        todayIso
      )
    ).toBe(false);
  });

  it("excludes future scheduled tasks", () => {
    expect(
      matchesTodayList(
        { scheduledDate: "2026-05-28", bucketOverride: null, completedAt: null },
        todayIso
      )
    ).toBe(false);
  });
});
