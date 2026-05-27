import { describe, expect, it } from "vitest";

import { buildTop3Status } from "./build-top3-status";
import { templateEodReview } from "./template-eod-review";

describe("templateEodReview", () => {
  it("returns summary and question", () => {
    const { summary, reflectiveQuestion } = templateEodReview({
      completionsToday: 2,
      top3Status: buildTop3Status([]),
      focusSecondsTotal: 0,
      focusTaskCount: 0,
    });
    expect(summary).toContain("2");
    expect(reflectiveQuestion.length).toBeGreaterThan(10);
  });
});
