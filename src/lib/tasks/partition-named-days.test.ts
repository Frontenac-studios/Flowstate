import { describe, expect, it } from "vitest";

import { datesInIsoWeek, toISODateString } from "@/lib/dates/local-day";

import { partitionNamedDays } from "./partition-named-days";

describe("partitionNamedDays", () => {
  const wed = new Date(2026, 4, 27); // Wed May 27 2026
  const weekIsos = datesInIsoWeek(wed).map(toISODateString);

  it("keeps overdue tasks in Today (not Later)", () => {
    const result = partitionNamedDays(
      [
        {
          id: "overdue",
          scheduledDate: "2026-05-26",
          bucketOverride: null,
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.today.map((t) => t.id)).toEqual(["overdue"]);
    expect(result.later).toHaveLength(0);
    expect(result.tomorrow).toHaveLength(0);
  });

  it("excludes later overrides from Today and partitions them to Later", () => {
    const result = partitionNamedDays(
      [
        {
          id: "later",
          scheduledDate: null,
          bucketOverride: "later",
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.today).toHaveLength(0);
    expect(result.later.map((t) => t.id)).toEqual(["later"]);
  });

  it("partitions tomorrow and weekday tasks without a This Week bucket", () => {
    const result = partitionNamedDays(
      [
        {
          id: "tomorrow",
          scheduledDate: "2026-05-28",
          bucketOverride: null,
          completedAt: null,
        },
        {
          id: "fri",
          scheduledDate: "2026-05-30",
          bucketOverride: null,
          completedAt: null,
        },
        {
          id: "next-week",
          scheduledDate: "2026-06-02",
          bucketOverride: null,
          completedAt: null,
        },
      ],
      wed
    );

    expect(result.tomorrow.map((t) => t.id)).toEqual(["tomorrow"]);
    expect(result.byWeekdayIso["2026-05-30"]?.map((t) => t.id)).toEqual(["fri"]);
    expect(result.later.map((t) => t.id)).toEqual(["next-week"]);
    expect(weekIsos).toHaveLength(7);
    for (const iso of weekIsos) {
      expect(result.byWeekdayIso[iso]).toBeDefined();
    }
  });
});
