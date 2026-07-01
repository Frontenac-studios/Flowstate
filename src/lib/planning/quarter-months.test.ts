import { describe, expect, it } from "vitest";

import { monthShortName, monthsForQuarter } from "./quarter-months";

describe("monthsForQuarter", () => {
  it("maps Q1–Q4 to calendar months", () => {
    expect(monthsForQuarter(1)).toEqual([1, 2, 3]);
    expect(monthsForQuarter(2)).toEqual([4, 5, 6]);
    expect(monthsForQuarter(3)).toEqual([7, 8, 9]);
    expect(monthsForQuarter(4)).toEqual([10, 11, 12]);
  });

  it("rejects invalid quarters", () => {
    expect(() => monthsForQuarter(0)).toThrow(RangeError);
    expect(() => monthsForQuarter(5)).toThrow(RangeError);
  });
});

describe("monthShortName", () => {
  it("returns abbreviated month labels", () => {
    expect(monthShortName(1)).toBe("Jan");
    expect(monthShortName(12)).toBe("Dec");
  });
});
