import { describe, expect, it } from "vitest";
import type { ConstellationItem } from "./constellations";
import { buildMonthlyReview, isMonthlyReviewDue, monthKey } from "./monthly-review";
const NOW = new Date("2026-07-15T12:00:00Z");
const item = (o: Partial<ConstellationItem> = {}): ConstellationItem => ({
  id: "a",
  title: "i",
  type: "idea",
  embedding: null,
  resurfaceCount: 0,
  lastTouchedAt: NOW,
  tags: null,
  status: "active",
  ...o,
});
describe("monthKey", () => {
  it("fmt", () => expect(monthKey(new Date(2026, 6, 1))).toBe("2026-07"));
});
describe("isMonthlyReviewDue", () => {
  it("due", () => expect(isMonthlyReviewDue(null, NOW)).toBe(true));
});
describe("buildMonthlyReview", () => {
  it("keeps", () =>
    expect(
      buildMonthlyReview([item({ id: "h", resurfaceCount: 4 })], NOW).keepsCalling[0]?.id
    ).toBe("h"));
});
