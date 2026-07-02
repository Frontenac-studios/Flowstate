import { describe, expect, it } from "vitest";

import {
  ESTIMATE_CONFIDENCE_MIN_SAMPLES,
  estimateConfidenceLabel,
  formatEstimateMinutes,
} from "./estimate-confidence";

describe("estimateConfidenceLabel", () => {
  it("returns learning copy below the sample threshold", () => {
    expect(estimateConfidenceLabel(0)).toBe("learning…");
    expect(estimateConfidenceLabel(1)).toBe(`learning… (1/${ESTIMATE_CONFIDENCE_MIN_SAMPLES})`);
    expect(estimateConfidenceLabel(ESTIMATE_CONFIDENCE_MIN_SAMPLES - 1)).toBe(
      `learning… (2/${ESTIMATE_CONFIDENCE_MIN_SAMPLES})`
    );
  });

  it("returns null once enough samples exist", () => {
    expect(estimateConfidenceLabel(ESTIMATE_CONFIDENCE_MIN_SAMPLES)).toBeNull();
    expect(estimateConfidenceLabel(10)).toBeNull();
  });
});

describe("formatEstimateMinutes", () => {
  it("appends learning hint when confidence is low", () => {
    expect(formatEstimateMinutes(45, 0)).toBe("45m · learning…");
    expect(formatEstimateMinutes(45, 2)).toBe(
      `45m · learning… (2/${ESTIMATE_CONFIDENCE_MIN_SAMPLES})`
    );
  });

  it("shows only minutes when confident", () => {
    expect(formatEstimateMinutes(45, ESTIMATE_CONFIDENCE_MIN_SAMPLES)).toBe("45m");
  });
});
