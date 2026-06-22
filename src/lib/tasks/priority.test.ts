import { describe, expect, it } from "vitest";

import { parsePriorityWord, priorityMeta } from "./priority";

describe("priorityMeta", () => {
  it("maps levels to labels and dot counts", () => {
    expect(priorityMeta(0).label).toBe("None");
    expect(priorityMeta(1)).toMatchObject({ label: "Low", dots: 1 });
    expect(priorityMeta(2)).toMatchObject({ label: "Med", dots: 2 });
    expect(priorityMeta(3)).toMatchObject({ label: "High", dots: 3 });
  });

  it("clamps unknown values to None", () => {
    expect(priorityMeta(4).level).toBe(0);
    expect(priorityMeta(-1).level).toBe(0);
  });
});

describe("parsePriorityWord", () => {
  it("recognizes the priority words (case-insensitive)", () => {
    expect(parsePriorityWord("none")).toBe(0);
    expect(parsePriorityWord("Low")).toBe(1);
    expect(parsePriorityWord("med")).toBe(2);
    expect(parsePriorityWord("medium")).toBe(2);
    expect(parsePriorityWord(" HIGH ")).toBe(3);
  });

  it("returns null for non-priority words", () => {
    expect(parsePriorityWord("urgent")).toBeNull();
    expect(parsePriorityWord("")).toBeNull();
  });
});
