import { describe, expect, it } from "vitest";

import { balancePassScopeKey, computeBalanceFlags, emptyCategoryWeights } from "./balance-pass";

describe("balance-pass", () => {
  it("ranks floor + stated focus above floor-only", () => {
    const weights = {
      professional: 95,
      personal_projects: 2,
      relationships: 1,
      body_mind: 1,
      adulting: 1,
    };
    const stated = new Set(["relationships" as const, "professional" as const]);
    const flags = computeBalanceFlags(weights, stated);

    expect(flags[0]?.category).toBe("relationships");
    expect(flags[0]?.tier).toBe("floor");
    expect(flags[0]?.rank).toBe(0);
    expect(flags.some((f) => f.category === "adulting" && f.rank === 1)).toBe(true);
  });

  it("flags target gaps for stated categories below fair share", () => {
    const weights = {
      professional: 40,
      personal_projects: 30,
      relationships: 20,
      body_mind: 10,
      adulting: 0,
    };
    const stated = new Set(["body_mind" as const, "relationships" as const]);
    const flags = computeBalanceFlags(weights, stated);

    const bodyMind = flags.find((f) => f.category === "body_mind");
    expect(bodyMind?.tier).toBe("target_gap");
    expect(bodyMind?.rank).toBe(2);
  });

  it("returns empty flags when activity is balanced", () => {
    const weights = emptyCategoryWeights();
    for (const category of Object.keys(weights)) {
      weights[category as keyof typeof weights] = 20;
    }
    const flags = computeBalanceFlags(weights, new Set());
    expect(flags).toEqual([]);
  });

  it("builds stable scope keys", () => {
    expect(balancePassScopeKey({ horizon: "week", year: 2026, weekStart: "2026-06-29" })).toBe(
      "week:2026-06-29"
    );
    expect(balancePassScopeKey({ horizon: "month", year: 2026, month: 6 })).toBe("month:2026-6");
  });
});
