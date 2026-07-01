import { describe, expect, it } from "vitest";

import { computeHitRate } from "./hit-rate";

describe("computeHitRate", () => {
  it("formats the gentle hit-rate phrase", () => {
    expect(computeHitRate(5, 7)).toEqual({
      daysWithWins: 5,
      windowDays: 7,
      phrase: "wins on 5 of the last 7 days",
    });
  });

  it("allows zero without judgmental framing", () => {
    expect(computeHitRate(0, 7).phrase).toBe("wins on 0 of the last 7 days");
  });
});
