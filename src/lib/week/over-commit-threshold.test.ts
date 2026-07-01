import { describe, expect, it } from "vitest";

import {
  COLD_START_WEEKS,
  DEFAULT_OVER_COMMIT_THRESHOLD,
  isDayOverCommitted,
  LEARNED_MIN_SAMPLE_DAYS,
  median,
  resolveOverCommitThreshold,
} from "./over-commit-threshold";

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("averages the middle pair for even lengths", () => {
    expect(median([2, 8, 4, 6])).toBe(5);
  });
});

describe("resolveOverCommitThreshold", () => {
  it("uses the cold-start default before enough history", () => {
    const result = resolveOverCommitThreshold([6, 7, 8, 9], COLD_START_WEEKS - 1);
    expect(result).toEqual({ threshold: DEFAULT_OVER_COMMIT_THRESHOLD, mode: "cold-start" });
  });

  it("switches to learned median after cold-start with enough samples", () => {
    const loads = Array.from({ length: LEARNED_MIN_SAMPLE_DAYS }, (_, i) => 6 + (i % 4));
    const result = resolveOverCommitThreshold(loads, COLD_START_WEEKS);
    expect(result.mode).toBe("learned");
    expect(result.threshold).toBe(7);
  });

  it("ignores zero-load days in the learned median", () => {
    const loads = [...Array.from({ length: LEARNED_MIN_SAMPLE_DAYS }, () => 8), 0, 0, 0];
    const result = resolveOverCommitThreshold(loads, COLD_START_WEEKS);
    expect(result).toEqual({ threshold: 8, mode: "learned" });
  });
});

describe("isDayOverCommitted", () => {
  it("flags strictly above threshold, not at threshold", () => {
    expect(isDayOverCommitted(11, 10)).toBe(true);
    expect(isDayOverCommitted(10, 10)).toBe(false);
    expect(isDayOverCommitted(9, 10)).toBe(false);
  });
});
