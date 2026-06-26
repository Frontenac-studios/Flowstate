import { describe, expect, it } from "vitest";

import { assertEditableBingoCell, isValidBingoCellIndex } from "@/lib/planning/bingo-cells";
import { BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";

describe("bingo cell validation", () => {
  it("treats null cell index as valid (panel-only goals)", () => {
    expect(isValidBingoCellIndex(null)).toBe(true);
  });

  it("rejects the FREE center cell", () => {
    expect(isValidBingoCellIndex(BINGO_FREE_CELL_INDEX)).toBe(false);
    expect(() => assertEditableBingoCell(BINGO_FREE_CELL_INDEX)).toThrow(/FREE center/);
  });

  it("accepts other in-range indices", () => {
    expect(isValidBingoCellIndex(0)).toBe(true);
    expect(isValidBingoCellIndex(24)).toBe(true);
  });
});
