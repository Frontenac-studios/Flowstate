import { describe, expect, it } from "vitest";

import { calendarEventColors, normalizeCalendarHex } from "./event-color";

describe("normalizeCalendarHex", () => {
  it("accepts 6-digit hex", () => {
    expect(normalizeCalendarHex("#039BE5")).toBe("#039be5");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeCalendarHex("#0af")).toBe("#00aaff");
  });

  it("rejects invalid values", () => {
    expect(normalizeCalendarHex(null)).toBeNull();
    expect(normalizeCalendarHex("blue")).toBeNull();
    expect(normalizeCalendarHex("#gg0000")).toBeNull();
  });
});

describe("calendarEventColors", () => {
  it("returns soft fill + solid stripe for Google colors", () => {
    expect(calendarEventColors("#039be5")).toEqual({
      stripe: "#039be5",
      fill: "color-mix(in srgb, #039be5 12%, var(--surface))",
      text: "color-mix(in srgb, #039be5 60%, var(--ink))",
    });
  });

  it("falls back to neutral tokens when missing", () => {
    expect(calendarEventColors(null)).toEqual({
      stripe: "var(--ink-faint)",
      fill: "var(--surface-2)",
      text: "var(--ink)",
    });
  });
});
