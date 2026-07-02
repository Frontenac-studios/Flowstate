import { describe, expect, it } from "vitest";

import {
  distinctTaskTags,
  normalizeTaskTag,
  normalizeTaskTags,
  taskMatchesTagFilter,
} from "./tags";

describe("normalizeTaskTag", () => {
  it("trims, strips leading #, and collapses whitespace", () => {
    expect(normalizeTaskTag("  #work  stuff  ")).toBe("work stuff");
  });

  it("caps length at 64 characters", () => {
    expect(normalizeTaskTag("a".repeat(80)).length).toBe(64);
  });
});

describe("normalizeTaskTags", () => {
  it("dedupes case-insensitively while preserving first casing", () => {
    expect(normalizeTaskTags(["Work", "work", "WORK"])).toEqual(["Work"]);
  });

  it("caps at 20 tags", () => {
    const raw = Array.from({ length: 25 }, (_, i) => `tag-${i}`);
    expect(normalizeTaskTags(raw)).toHaveLength(20);
  });
});

describe("distinctTaskTags", () => {
  it("returns sorted unique tags preserving first-seen casing", () => {
    expect(
      distinctTaskTags([{ tags: ["beta", "Alpha"] }, { tags: ["alpha"] }, { tags: null }])
    ).toEqual(["Alpha", "beta"]);
  });
});

describe("taskMatchesTagFilter", () => {
  it("passes when no filter is selected", () => {
    expect(taskMatchesTagFilter(["work"], [])).toBe(true);
  });

  it("matches any selected tag with OR semantics", () => {
    expect(taskMatchesTagFilter(["work", "urgent"], ["urgent", "other"])).toBe(true);
    expect(taskMatchesTagFilter(["work"], ["urgent"])).toBe(false);
  });
});
