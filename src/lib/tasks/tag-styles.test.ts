import { describe, expect, it } from "vitest";

import {
  colouredTags,
  groupTagsByKind,
  resolveTagStyle,
  tagKey,
  type TagStyle,
} from "./tag-styles";

const stored = new Map<string, TagStyle>([
  [tagKey("Deep work"), { kind: "effort", color: "sky" }],
  [tagKey("Maya"), { kind: "people", color: null }],
  [tagKey("blocked"), { kind: "status", color: null }], // user turned the built-in gray
]);

describe("resolveTagStyle", () => {
  it("prefers the stored style, then a built-in status, then plain gray", () => {
    expect(resolveTagStyle("deep WORK", stored)).toEqual({ kind: "effort", color: "sky" });
    expect(resolveTagStyle("Waiting on", stored)).toEqual({ kind: "status", color: "sand" });
    expect(resolveTagStyle("blocked", stored)).toEqual({ kind: "status", color: null });
    expect(resolveTagStyle("billing", stored)).toEqual({ kind: null, color: null });
  });
});

describe("colouredTags", () => {
  it("keeps only coloured tags, in order", () => {
    expect(colouredTags(["billing", "waiting on", "Deep work", "Maya"], stored)).toEqual([
      "waiting on",
      "Deep work",
    ]);
  });
});

describe("groupTagsByKind", () => {
  it("always lists the four kinds and adds Other only when needed", () => {
    const groups = groupTagsByKind(["billing", "Maya", "waiting on", "blocked"], stored);
    expect(groups.map((g) => [g.kind, g.tags])).toEqual([
      ["status", ["waiting on", "blocked"]],
      ["type", []],
      ["effort", []],
      ["people", ["Maya"]],
      [null, ["billing"]],
    ]);
    expect(groupTagsByKind([], stored)).toHaveLength(4);
  });
});
