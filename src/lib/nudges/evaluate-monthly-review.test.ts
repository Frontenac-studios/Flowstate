import { describe, expect, it } from "vitest";
import {
  evaluateMonthlyReview,
  localMonthKey,
  templateMonthlyReviewMessage,
} from "./evaluate-monthly-review";
describe("evaluateMonthlyReview", () => {
  it("fires first Sunday", () => {
    expect(
      evaluateMonthlyReview({
        now: new Date("2026-07-05T18:00:00.000Z"),
        tzOffsetMinutes: -480,
        alreadyNudgedThisMonth: false,
      }).shouldFire
    ).toBe(true);
  });
  it("month key", () => {
    expect(localMonthKey(new Date("2026-07-05T18:00:00.000Z"), -480)).toBe("2026-07");
    expect(templateMonthlyReviewMessage()).toContain("Abyss");
  });
});
