import { describe, expect, it } from "vitest";

import { moveWeekSelection, type WeekNavColumn } from "./week-grid-navigation";

// mon: a,b · tue: (empty) · wed: c,d,e · inbox: f
const columns: WeekNavColumn[] = [
  { taskIds: ["a", "b"] },
  { taskIds: [] },
  { taskIds: ["c", "d", "e"] },
  { taskIds: ["f"] },
];

describe("moveWeekSelection", () => {
  it("moves down and up within a column, clamping at the ends", () => {
    expect(moveWeekSelection(columns, "a", "down")).toBe("b");
    expect(moveWeekSelection(columns, "b", "down")).toBe("b");
    expect(moveWeekSelection(columns, "b", "up")).toBe("a");
    expect(moveWeekSelection(columns, "a", "up")).toBe("a");
  });

  it("skips empty columns when moving right", () => {
    expect(moveWeekSelection(columns, "a", "right")).toBe("c");
  });

  it("skips empty columns when moving left", () => {
    expect(moveWeekSelection(columns, "c", "left")).toBe("a");
  });

  it("clamps the row index into a shorter target column", () => {
    // from wed index 2 (e) leftward → mon has only 2 rows → clamp to b
    expect(moveWeekSelection(columns, "e", "left")).toBe("b");
  });

  it("crosses into the inbox column on the right", () => {
    expect(moveWeekSelection(columns, "e", "right")).toBe("f");
  });

  it("stays put when there is no column in the requested direction", () => {
    expect(moveWeekSelection(columns, "a", "left")).toBe("a");
    expect(moveWeekSelection(columns, "f", "right")).toBe("f");
  });

  it("selects the first row when nothing is selected", () => {
    expect(moveWeekSelection(columns, null, "down")).toBe("a");
    expect(moveWeekSelection(columns, null, "right")).toBe("a");
  });

  it("treats a stale selection as unselected", () => {
    expect(moveWeekSelection(columns, "gone", "down")).toBe("a");
  });

  it("returns null when every column is empty", () => {
    expect(moveWeekSelection([{ taskIds: [] }], null, "down")).toBeNull();
  });
});
