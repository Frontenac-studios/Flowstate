import { describe, expect, it } from "vitest";

import {
  ageInDays,
  compareByBrightness,
  DIMMING_AFTER_DAYS,
  filterItems,
  groupItems,
  isDimming,
  selectKeepsCalling,
  type AbyssGroupableItem,
} from "./grouping";

const NOW = new Date("2026-06-27T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

function item(overrides: Partial<AbyssGroupableItem> = {}): AbyssGroupableItem {
  return {
    id: Math.random().toString(36).slice(2),
    title: "an idea",
    note: null,
    type: "idea",
    category: null,
    status: "active",
    resurfaceCount: 0,
    lastTouchedAt: daysAgo(1),
    ...overrides,
  };
}

describe("ageInDays", () => {
  it("floors to whole days and never goes negative", () => {
    expect(ageInDays(NOW, daysAgo(3))).toBe(3);
    expect(ageInDays(NOW, new Date(NOW.getTime() + 86_400_000))).toBe(0);
  });
});

describe("isDimming", () => {
  it("marks active items past the threshold", () => {
    expect(isDimming(NOW, item({ lastTouchedAt: daysAgo(DIMMING_AFTER_DAYS) }))).toBe(true);
    expect(isDimming(NOW, item({ lastTouchedAt: daysAgo(DIMMING_AFTER_DAYS - 1) }))).toBe(false);
  });

  it("never dims non-active items", () => {
    expect(isDimming(NOW, item({ status: "promoted", lastTouchedAt: daysAgo(400) }))).toBe(false);
  });
});

describe("compareByBrightness", () => {
  it("orders by resurface count, then recency", () => {
    const dim = item({ resurfaceCount: 1, lastTouchedAt: daysAgo(1) });
    const bright = item({ resurfaceCount: 5, lastTouchedAt: daysAgo(10) });
    const recent = item({ resurfaceCount: 1, lastTouchedAt: daysAgo(0) });
    const sorted = [dim, bright, recent].sort(compareByBrightness);
    expect(sorted[0]).toBe(bright);
    expect(sorted[1]).toBe(recent);
    expect(sorted[2]).toBe(dim);
  });
});

describe("filterItems", () => {
  const items = [
    item({ title: "watercolour", type: "idea", lastTouchedAt: daysAgo(2) }),
    item({ title: "standing desk", type: "task", lastTouchedAt: daysAgo(80) }),
    item({ title: "etsy prints", type: "idea", note: "side income", lastTouchedAt: daysAgo(2) }),
  ];

  it("filters by type", () => {
    const out = filterItems(items, { types: ["task"], age: "all", query: "" }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("standing desk");
  });

  it("filters by age (dimming vs fresh)", () => {
    expect(filterItems(items, { types: [], age: "dimming", query: "" }, NOW)).toHaveLength(1);
    expect(filterItems(items, { types: [], age: "fresh", query: "" }, NOW)).toHaveLength(2);
  });

  it("searches title and note, case-insensitively", () => {
    expect(filterItems(items, { types: [], age: "all", query: "WATER" }, NOW)).toHaveLength(1);
    expect(filterItems(items, { types: [], age: "all", query: "income" }, NOW)).toHaveLength(1);
  });

  it("keeps everything when unfiltered", () => {
    expect(filterItems(items, { types: [], age: "all", query: "  " }, NOW)).toHaveLength(3);
  });
});

describe("selectKeepsCalling", () => {
  it("returns only bright active items, brightest first", () => {
    const out = selectKeepsCalling([
      item({ title: "low", resurfaceCount: 1 }),
      item({ title: "high", resurfaceCount: 4 }),
      item({ title: "mid", resurfaceCount: 3 }),
      item({ title: "archived-bright", resurfaceCount: 9, status: "archived" }),
    ]);
    expect(out.map((i) => i.title)).toEqual(["high", "mid"]);
  });
});

describe("groupItems", () => {
  it("groups by category in enum order, uncategorised last, dropping empties", () => {
    const groups = groupItems(
      [
        item({ category: "adulting" }),
        item({ category: "professional" }),
        item({ category: null }),
      ],
      "category",
      NOW
    );
    expect(groups.map((g) => g.key)).toEqual(["professional", "adulting", "uncategorised"]);
  });

  it("groups by type", () => {
    const groups = groupItems([item({ type: "task" }), item({ type: "idea" })], "type", NOW);
    expect(groups.map((g) => g.key)).toEqual(["idea", "task"]);
  });

  it("groups by age into recent and drifting", () => {
    const groups = groupItems(
      [item({ lastTouchedAt: daysAgo(1) }), item({ lastTouchedAt: daysAgo(80) })],
      "age",
      NOW
    );
    expect(groups.map((g) => g.key)).toEqual(["fresh", "dimming"]);
  });

  it("sorts within a group by recency (newest first)", () => {
    const groups = groupItems(
      [
        item({ category: "professional", title: "older", lastTouchedAt: daysAgo(10) }),
        item({ category: "professional", title: "newer", lastTouchedAt: daysAgo(1) }),
      ],
      "category",
      NOW
    );
    expect(groups[0].items.map((i) => i.title)).toEqual(["newer", "older"]);
  });

  describe("pattern mode", () => {
    it("groups by tag, biggest constellation first, untagged last", () => {
      const groups = groupItems(
        [
          item({ title: "wc1", tags: ["watercolour"] }),
          item({ title: "wc2", tags: ["watercolour"] }),
          item({ title: "admin", tags: ["studio"] }),
          item({ title: "loose", tags: null }),
        ],
        "pattern",
        NOW
      );
      expect(groups.map((g) => g.key)).toEqual(["tag:watercolour", "tag:studio", "untagged"]);
      expect(groups[0].label).toBe("watercolour");
    });

    it("lists a multi-tag item under each of its tags", () => {
      const groups = groupItems(
        [item({ title: "both", tags: ["a", "b"] }), item({ title: "just-b", tags: ["b"] })],
        "pattern",
        NOW
      );
      // "b" has 2 members so it sorts before "a"; "both" appears in both groups
      expect(groups.map((g) => g.key)).toEqual(["tag:b", "tag:a"]);
      expect(groups.find((g) => g.key === "tag:a")?.items.map((i) => i.title)).toEqual(["both"]);
      expect(
        groups
          .find((g) => g.key === "tag:b")
          ?.items.map((i) => i.title)
          .sort()
      ).toEqual(["both", "just-b"]);
    });

    it("drops the untagged group when everything is tagged", () => {
      const groups = groupItems([item({ tags: ["x"] })], "pattern", NOW);
      expect(groups.map((g) => g.key)).toEqual(["tag:x"]);
    });
  });
});
