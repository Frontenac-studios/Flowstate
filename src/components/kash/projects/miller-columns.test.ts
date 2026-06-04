import { describe, expect, it } from "vitest";

import {
  ghostColumnCount,
  MAX_VISIBLE_COLUMNS,
  MILLER_STRIP_PADDING_X_PX,
  MIN_VISIBLE_COLUMNS,
  millerColumnShellClass,
  millerColumnWidthClass,
  MILLER_COLUMN_MIN_HEIGHT_CLASS,
  VIEWPORT_MIN_FOR_FIVE_COLUMNS,
  visibleColumnTarget,
} from "./miller-columns";

describe("visibleColumnTarget", () => {
  const minWidthForFive =
    MAX_VISIBLE_COLUMNS * 256 + (MAX_VISIBLE_COLUMNS - 1) * 8 + MILLER_STRIP_PADDING_X_PX;

  it("returns 4 columns below the five-column width threshold", () => {
    expect(visibleColumnTarget(minWidthForFive - 1)).toBe(MIN_VISIBLE_COLUMNS);
    expect(visibleColumnTarget(1048)).toBe(MIN_VISIBLE_COLUMNS);
  });

  it("returns 5 columns at or above the five-column width threshold", () => {
    expect(visibleColumnTarget(minWidthForFive)).toBe(MAX_VISIBLE_COLUMNS);
    expect(visibleColumnTarget(1400)).toBe(MAX_VISIBLE_COLUMNS);
  });

  it("returns 5 columns when viewport is wide even if strip is narrow", () => {
    expect(visibleColumnTarget(900, VIEWPORT_MIN_FOR_FIVE_COLUMNS)).toBe(MAX_VISIBLE_COLUMNS);
    expect(visibleColumnTarget(900, 1920)).toBe(MAX_VISIBLE_COLUMNS);
  });

  it("uses strip width when viewport is narrow", () => {
    expect(visibleColumnTarget(minWidthForFive - 1, 1024)).toBe(MIN_VISIBLE_COLUMNS);
  });
});

describe("ghostColumnCount", () => {
  it("fills remaining slots up to the target", () => {
    expect(ghostColumnCount(1, 4)).toBe(3);
    expect(ghostColumnCount(2, 4)).toBe(2);
    expect(ghostColumnCount(1, 5)).toBe(4);
  });

  it("returns zero when real columns meet or exceed the target", () => {
    expect(ghostColumnCount(4, 4)).toBe(0);
    expect(ghostColumnCount(6, 4)).toBe(0);
  });
});

describe("millerColumnShellClass", () => {
  it("includes width, minimum height, and stretch layout", () => {
    const shell = millerColumnShellClass("flex-1 min-w-0");
    expect(shell).toContain("flex-1 min-w-0");
    expect(shell).toContain(MILLER_COLUMN_MIN_HEIGHT_CLASS);
    expect(shell).toContain("h-full");
    expect(shell).toContain("self-stretch");
  });
});

describe("millerColumnWidthClass", () => {
  it("uses flex fit when columns share the strip width", () => {
    expect(millerColumnWidthClass(true)).toBe("flex-1 min-w-0");
  });

  it("uses fixed width when scrolling", () => {
    expect(millerColumnWidthClass(false)).toBe("w-64 shrink-0");
  });
});
