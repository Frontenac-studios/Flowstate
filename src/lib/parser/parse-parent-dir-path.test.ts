import { describe, expect, it } from "vitest";

import { parseParentDirPath } from "./parse-parent-dir-path";

describe("parseParentDirPath", () => {
  it("parses nested path with + on leaf segment", () => {
    const result = parseParentDirPath("Product & Portfolio//+ Magic-Link Gate");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path.segments).toEqual([
      { name: "Product & Portfolio", create: false },
      { name: "Magic-Link Gate", create: true },
    ]);
    expect(result.path.pathKey).toBe("product & portfolio//magic-link gate");
    expect(result.path.displayPath).toBe("Product & Portfolio // Magic-Link Gate");
  });

  it("parses + on both segments", () => {
    const result = parseParentDirPath("+ A//+ B");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path.segments[0]).toEqual({ name: "A", create: true });
    expect(result.path.segments[1]).toEqual({ name: "B", create: true });
  });

  it("parses single segment without //", () => {
    const result = parseParentDirPath("+ Research");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path.segments).toHaveLength(1);
    expect(result.path.pathKey).toBe("research");
  });

  it("rejects empty segment in path", () => {
    expect(parseParentDirPath("A//").ok).toBe(false);
    expect(parseParentDirPath("//B").ok).toBe(false);
    expect(parseParentDirPath("+").ok).toBe(false);
  });
});
