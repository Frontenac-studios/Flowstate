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
        { completedAt: new Date(2026, 0, 6), category: "personal" },
        { completedAt: new Date(2026, 0, 6), category: "personal" },
        { completedAt: new Date(2026, 0, 6), category: "personal" },
      ],
      timeEntries: [
        {
          startedAt: weekMonday,
          endedAt: new Date(2026, 0, 5, 12, 0, 0),
          category: "business",
        },
      ],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    const week = q1?.weeks.find((w) => w.weekStart === "2026-01-05");
    expect(week?.dominantCategory).toBe("business");
  });

  it("falls back to completion counts when no time data", () => {
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [
        { completedAt: new Date(2026, 1, 10), category: "personal" },
        { completedAt: new Date(2026, 1, 11), category: "personal" },
        { completedAt: new Date(2026, 1, 12), category: "business" },
      ],
      timeEntries: [],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    const week = q1?.weeks.find((w) => w.weekStart === "2026-02-09");
    expect(week?.dominantCategory).toBe("personal");
  });

  it("builds proportional quarter weights", () => {
    const result = aggregateYearActivity({
      year: 2026,
      completedTasks: [
        { completedAt: new Date(2026, 0, 6), category: "business" },
        { completedAt: new Date(2026, 0, 7), category: "business" },
        { completedAt: new Date(2026, 0, 8), category: "personal" },
      ],
      timeEntries: [],
    });

    const q1 = result.quarters.find((q) => q.quarter === 1);
    expect(q1?.categoryWeights.business).toBe(2);
    expect(q1?.categoryWeights.personal).toBe(1);
  });

  it("detects neglected categories below floor share", () => {
    const totals = {
      business: 98,
      personal: 2,
    };
    const neglected = detectNeglectedCategories(totals);
    expect(neglected).toContain("personal");
    expect(neglected).not.toContain("business");
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
