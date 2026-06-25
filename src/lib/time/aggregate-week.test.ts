import { describe, expect, it } from "vitest";

import { aggregateWeek, type WeekEntryInput } from "./aggregate-week";

function entry(over: Partial<WeekEntryInput>): WeekEntryInput {
  return {
    startedAt: new Date("2026-06-24T09:00:00Z"),
    endedAt: new Date("2026-06-24T10:00:00Z"),
    category: "professional",
    projectId: "p1",
    projectName: "Website Relaunch",
    ...over,
  };
}

describe("aggregateWeek", () => {
  it("returns zeros for no entries", () => {
    const r = aggregateWeek({ entries: [] });
    expect(r).toEqual({ totalSeconds: 0, entryCount: 0, byCategory: [], byProject: [] });
  });

  it("sums seconds per category and per project", () => {
    const r = aggregateWeek({
      entries: [
        entry({}), // 1h professional / p1
        entry({
          startedAt: new Date("2026-06-24T11:00:00Z"),
          endedAt: new Date("2026-06-24T11:30:00Z"),
          category: "body_mind",
          projectId: "p2",
          projectName: "Marathon Training",
        }), // 30m body_mind / p2
      ],
    });
    expect(r.totalSeconds).toBe(5400);
    expect(r.entryCount).toBe(2);
    expect(r.byCategory).toEqual([
      { category: "professional", seconds: 3600 },
      { category: "body_mind", seconds: 1800 },
    ]);
    expect(r.byProject).toEqual([
      { projectId: "p1", projectName: "Website Relaunch", seconds: 3600 },
      { projectId: "p2", projectName: "Marathon Training", seconds: 1800 },
    ]);
  });

  it("merges entries that share a category or project", () => {
    const r = aggregateWeek({
      entries: [
        entry({}),
        entry({
          startedAt: new Date("2026-06-25T09:00:00Z"),
          endedAt: new Date("2026-06-25T09:30:00Z"),
        }),
      ],
    });
    expect(r.byCategory).toEqual([{ category: "professional", seconds: 5400 }]);
    expect(r.byProject).toEqual([
      { projectId: "p1", projectName: "Website Relaunch", seconds: 5400 },
    ]);
  });

  it("folds loose tasks into a single null-project bucket", () => {
    const r = aggregateWeek({
      entries: [
        entry({ projectId: null, projectName: null }),
        entry({
          projectId: null,
          projectName: null,
          startedAt: new Date("2026-06-25T09:00:00Z"),
          endedAt: new Date("2026-06-25T11:00:00Z"),
          category: "adulting",
        }),
      ],
    });
    expect(r.byProject).toEqual([{ projectId: null, projectName: null, seconds: 10800 }]);
  });

  it("sorts both groupings by seconds descending", () => {
    const r = aggregateWeek({
      entries: [
        entry({ category: "adulting", projectId: "p1", projectName: "A" }), // 1h
        entry({
          startedAt: new Date("2026-06-24T09:00:00Z"),
          endedAt: new Date("2026-06-24T12:00:00Z"),
          category: "relationships",
          projectId: "p2",
          projectName: "B",
        }), // 3h
      ],
    });
    expect(r.byCategory.map((c) => c.category)).toEqual(["relationships", "adulting"]);
    expect(r.byProject.map((p) => p.projectName)).toEqual(["B", "A"]);
  });

  it("counts a running entry up to now", () => {
    const r = aggregateWeek({
      entries: [entry({ startedAt: new Date("2026-06-24T09:00:00Z"), endedAt: null })],
      now: new Date("2026-06-24T09:45:00Z"),
    });
    expect(r.totalSeconds).toBe(2700);
  });

  it("ignores non-positive windows", () => {
    const r = aggregateWeek({
      entries: [
        entry({
          startedAt: new Date("2026-06-24T10:00:00Z"),
          endedAt: new Date("2026-06-24T10:00:00Z"),
        }),
      ],
    });
    expect(r.totalSeconds).toBe(0);
    expect(r.entryCount).toBe(0);
  });
});
