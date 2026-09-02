import { describe, expect, it } from "vitest";

import { buildIcpSeed } from "./seed";

describe("buildIcpSeed", () => {
  it("folds Direction, won clients, rate floor, and Targets into the first segment", () => {
    const seed = buildIcpSeed({
      directions: ["We serve early-stage teams shipping production software."],
      wonClientNames: ["Great White", "Hume"],
      targetTitles: ["$40k booked", "Sign 3 clients"],
      rateFloorCents: 4500,
    });
    expect(seed.segments).toHaveLength(1);
    const f = seed.segments[0]!.firmographics;
    expect(f).toContain("early-stage teams");
    expect(f).toContain("Great White, Hume");
    expect(f).toContain("$45/hr");
    expect(f).toContain("$40k booked");
    expect(seed.weights.fit).toBe(40);
    expect(seed.outreachVoice.warmth).toBe("professional");
  });

  it("degrades to a placeholder when nothing is configured yet", () => {
    const seed = buildIcpSeed({
      directions: [],
      wonClientNames: [],
      targetTitles: [],
      rateFloorCents: null,
    });
    expect(seed.segments[0]!.firmographics).toBe("Describe the companies worth pursuing.");
    expect(seed.exclusions).toEqual([]);
  });
});
