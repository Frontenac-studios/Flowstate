import { describe, expect, it } from "vitest";

import { moveInList } from "./list-selection";

const ids = ["a", "b", "c"];

describe("moveInList", () => {
  it("steps down and up between rows", () => {
    expect(moveInList(ids, "a", 1)).toBe("b");
    expect(moveInList(ids, "b", 1)).toBe("c");
    expect(moveInList(ids, "c", -1)).toBe("b");
  });

  it("clamps at both ends without wrapping", () => {
    expect(moveInList(ids, "c", 1)).toBe("c");
    expect(moveInList(ids, "a", -1)).toBe("a");
  });

  it("selects the first row on a downward step with nothing selected", () => {
    expect(moveInList(ids, null, 1)).toBe("a");
  });

  it("selects the last row on an upward step with nothing selected", () => {
    expect(moveInList(ids, null, -1)).toBe("c");
  });

  it("treats a stale selection (id no longer present) as unselected", () => {
    expect(moveInList(ids, "gone", 1)).toBe("a");
  });

  it("returns the current selection unchanged for an empty list", () => {
    expect(moveInList([], "a", 1)).toBe("a");
    expect(moveInList([], null, 1)).toBeNull();
  });
});
