import { describe, expect, it } from "vitest";

import { clamp, shouldTriggerComplete, snapReveal, SWIPE_COMPLETE_THRESHOLD_PX } from "./row-swipe";

describe("clamp", () => {
  it("bounds a value into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("snapReveal", () => {
  it("opens fully at or past half the rail width", () => {
    expect(snapReveal(44, 88)).toBe(88);
    expect(snapReveal(60, 88)).toBe(88);
    expect(snapReveal(88, 88)).toBe(88);
  });

  it("stays closed below half", () => {
    expect(snapReveal(43, 88)).toBe(0);
    expect(snapReveal(20, 88)).toBe(0);
  });

  it("is closed when there is no rail", () => {
    expect(snapReveal(30, 0)).toBe(0);
  });
});

describe("shouldTriggerComplete", () => {
  it("fires at or past the threshold", () => {
    expect(shouldTriggerComplete(SWIPE_COMPLETE_THRESHOLD_PX)).toBe(true);
    expect(shouldTriggerComplete(SWIPE_COMPLETE_THRESHOLD_PX + 10)).toBe(true);
  });

  it("does not fire below the threshold", () => {
    expect(shouldTriggerComplete(SWIPE_COMPLETE_THRESHOLD_PX - 1)).toBe(false);
    expect(shouldTriggerComplete(0)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(shouldTriggerComplete(40, 30)).toBe(true);
    expect(shouldTriggerComplete(20, 30)).toBe(false);
  });
});
