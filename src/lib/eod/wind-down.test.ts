import { describe, expect, it } from "vitest";

import {
  clampWindDownHour,
  defaultWindDownHour,
  formatHourLabel,
  top3TargetHour,
} from "./wind-down";

describe("clampWindDownHour", () => {
  it("keeps an in-range hour", () => {
    expect(clampWindDownHour(18)).toBe(18);
  });

  it("clamps below the minimum and above the maximum", () => {
    expect(clampWindDownHour(6)).toBe(12);
    expect(clampWindDownHour(30)).toBe(23);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampWindDownHour(Number.NaN)).toBe(defaultWindDownHour());
  });
});

describe("top3TargetHour", () => {
  it("is one hour before wind-down", () => {
    expect(top3TargetHour(18)).toBe(17);
    expect(top3TargetHour(20)).toBe(19);
  });
});

describe("formatHourLabel", () => {
  it("formats afternoon and evening hours", () => {
    expect(formatHourLabel(17)).toBe("5:00p");
    expect(formatHourLabel(18)).toBe("6:00p");
    expect(formatHourLabel(12)).toBe("12:00p");
  });

  it("formats morning hours", () => {
    expect(formatHourLabel(9)).toBe("9:00a");
    expect(formatHourLabel(0)).toBe("12:00a");
  });
});
