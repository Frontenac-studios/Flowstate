import { describe, expect, it } from "vitest";

import {
  distinctTags,
  MAX_TAGS_PER_ITEM,
  normalizeTag,
  normalizeTags,
  suggestTagsFromNeighbours,
  type TagNeighbour,
} from "./tags";

describe("normalizeTag", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeTag("  Studio   Admin ")).toBe("studio admin");
    expect(normalizeTag("Watercolour")).toBe("watercolour");
  });

  it("caps length", () => {
    expect(normalizeTag("x".repeat(50)).length).toBe(32);
  });
});

describe("normalizeTags", () => {
  it("drops empties and dedupes case-insensitively, preserving order", () => {
    expect(normalizeTags(["Studio", "studio", "  ", "Admin"])).toEqual(["studio", "admin"]);
  });

  it("caps the count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many).length).toBe(MAX_TAGS_PER_ITEM);
  });
});

describe("distinctTags", () => {
  it("returns the sorted union, treating null as none", () => {
    expect(distinctTags([{ tags: ["b", "a"] }, { tags: null }, { tags: ["a", "c"] }])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("suggestTagsFromNeighbours", () => {
  const tagged = (embedding: number[] | null, tags: string[] | null): TagNeighbour => ({
    embedding,
    tags,
  });

  it("suggests tags from near neighbours, most-similar first", () => {
    const neighbours = [
      tagged([1, 0], ["watercolour"]),
      tagged([0.9, 0.1], ["studio"]), // slightly less similar to [1,0]
      tagged([0, 1], ["taxes"]), // orthogonal, below threshold
    ];
    const out = suggestTagsFromNeighbours([1, 0], neighbours, { threshold: 0.6 });
    expect(out).toEqual(["watercolour", "studio"]);
  });

  it("excludes the item's own tags", () => {
    const neighbours = [tagged([1, 0], ["watercolour", "studio"])];
    const out = suggestTagsFromNeighbours([1, 0], neighbours, {
      threshold: 0.6,
      exclude: ["watercolour"],
    });
    expect(out).toEqual(["studio"]);
  });

  it("ignores neighbours below threshold or without tags/embeddings", () => {
    const neighbours = [
      tagged([0, 1], ["taxes"]), // below threshold
      tagged([1, 0], null), // no tags
      tagged(null, ["x"]), // no embedding
    ];
    expect(suggestTagsFromNeighbours([1, 0], neighbours)).toEqual([]);
  });

  it("dedupes a tag carried by several neighbours and respects max", () => {
    const neighbours = [tagged([1, 0], ["a"]), tagged([1, 0], ["a", "b"]), tagged([1, 0], ["c"])];
    expect(suggestTagsFromNeighbours([1, 0], neighbours, { max: 2 })).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty query vector", () => {
    expect(suggestTagsFromNeighbours([], [tagged([1, 0], ["a"])])).toEqual([]);
  });
});
