import { describe, expect, it } from "vitest";

import { PLAN_MODE_TTL_MS } from "./plan-mode-constants";
import { resolveInitialPlanMode } from "./resolve-initial-plan-mode";

describe("resolveInitialPlanMode", () => {
  const now = new Date("2026-05-26T12:00:00");

  it("returns day when no lastActiveAt", () => {
    expect(
      resolveInitialPlanMode(now, {
        lastPlanMode: "week",
        lastActiveAt: null,
        mondayChoiceDate: null,
      })
    ).toBe("day");
  });

  it("returns remembered mode within 2h", () => {
    const recent = new Date(now.getTime() - PLAN_MODE_TTL_MS + 60_000).toISOString();
    expect(
      resolveInitialPlanMode(now, {
        lastPlanMode: "week",
        lastActiveAt: recent,
        mondayChoiceDate: null,
      })
    ).toBe("week");
  });

  it("returns day when memory is stale", () => {
    const stale = new Date(now.getTime() - PLAN_MODE_TTL_MS - 1).toISOString();
    expect(
      resolveInitialPlanMode(now, {
        lastPlanMode: "week",
        lastActiveAt: stale,
        mondayChoiceDate: null,
      })
    ).toBe("day");
  });

  it("returns day for invalid lastActiveAt", () => {
    expect(
      resolveInitialPlanMode(now, {
        lastPlanMode: "week",
        lastActiveAt: "not-a-date",
        mondayChoiceDate: null,
      })
    ).toBe("day");
  });
});
