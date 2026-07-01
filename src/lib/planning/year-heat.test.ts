import { describe, expect, it } from "vitest";

import {
  aggregateYearActivity,
  detectNeglectedCategories,
  quarterDateRange,
  weeksInQuarter,
} from "./year-heat";

describe("year-heat", () => {
  it("lists ISO weeks overlapping Q1 2026", () => {
    const weeks = weeksInQuarter(2026, 1);
    expect(weeks.length).toBeGreaterThanOrEqual(12);
    expect(weeks[0]).toBe("2025-12-29");
  });

  it("returns calendar quarter bounds", () => {
    const q1 = quarterDateRange(2026, 1);
    expect(q1.start.getMonth()).toBe(0);
    expect(q1.end.getMonth()).toBe(2);
    expect(q1.end.getDate()).toBe(31);
  });

  it("prefers time seconds over completion counts for dominant week", () => {
    const weekMonday = new Date(2026, 0, 5, 10, 0, 0);
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [
        { completedAt: new Date(2026, 0, 6), category: "adulting" },
        { completedAt: new Date(2026, 0, 6), category: "adulting" },
        { completedAt: new Date(2026, 0, 6), category: "adulting" },
      ],
      timeEntries: [
        {
          startedAt: weekMonday,
          endedAt: new Date(2026, 0, 5, 12, 0, 0),
          category: "professional",
        },
      ],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    const week = q1?.weeks.find((w) => w.weekStart === "2026-01-05");
    expect(week?.dominantCategory).toBe("professional");
  });

  it("falls back to completion counts when no time data", () => {
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [
        { completedAt: new Date(2026, 1, 10), category: "body_mind" },
        { completedAt: new Date(2026, 1, 11), category: "body_mind" },
        { completedAt: new Date(2026, 1, 12), category: "relationships" },
      ],
      timeEntries: [],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    const week = q1?.weeks.find((w) => w.weekStart === "2026-02-09");
    expect(week?.dominantCategory).toBe("body_mind");
  });

  it("builds proportional quarter weights", () => {
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [
        { completedAt: new Date(2026, 0, 6), category: "professional" },
        { completedAt: new Date(2026, 0, 7), category: "professional" },
        { completedAt: new Date(2026, 0, 8), category: "body_mind" },
      ],
      timeEntries: [],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    expect(q1?.categoryWeights.professional).toBe(2);
    expect(q1?.categoryWeights.body_mind).toBe(1);
  });

  it("detects neglected categories below floor share", () => {
    const totals = {
      professional: 90,
      personal_projects: 5,
      relationships: 2,
      body_mind: 2,
      adulting: 1,
    };
    const neglected = detectNeglectedCategories(totals);
    expect(neglected).toContain("adulting");
    expect(neglected).toContain("relationships");
    expect(neglected).not.toContain("professional");
  });

  it("returns no neglected categories when year is empty", () => {
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [],
      timeEntries: [],
    });
    expect(result.neglectedCategories).toEqual([]);
  });
});
