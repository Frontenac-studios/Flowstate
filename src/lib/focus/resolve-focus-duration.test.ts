import { describe, expect, it } from "vitest";

import {
  DEFAULT_FOCUS_WORK_SECONDS,
  resolveFocusWorkDurationSeconds,
} from "./resolve-focus-duration";

describe("resolveFocusWorkDurationSeconds", () => {
  it("uses block length when present", () => {
    expect(resolveFocusWorkDurationSeconds({ blockStartMin: 540, blockEndMin: 585 })).toBe(45 * 60);
  });

  it("uses task estimate when no block", () => {
    expect(resolveFocusWorkDurationSeconds({ timeEstimateMinutes: 30 })).toBe(30 * 60);
  });

  it("falls back to 25 minutes", () => {
    expect(resolveFocusWorkDurationSeconds({})).toBe(DEFAULT_FOCUS_WORK_SECONDS);
  });
});
