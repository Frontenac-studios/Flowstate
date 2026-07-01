import { describe, expect, it } from "vitest";

import { buildCareStatsSummary } from "./care-stats";
import { GARDEN_DORMANCY_DAYS, gardenLifeState } from "./garden-dormancy";
import { deriveLiftsMe } from "./lifts-me";

describe("care-stats", () => {
  it("summarizes frequency and mood gently", () => {
    const summary = buildCareStatsSummary({
      now: new Date("2026-07-01T12:00:00Z"),
      events: [
        { occurredAt: new Date("2026-06-30T10:00:00Z") },
        { occurredAt: new Date("2026-07-01T09:00:00Z") },
      ],
      reflections: [
        { reflectionDate: "2026-06-30", mood: 4 },
        { reflectionDate: "2026-07-01", mood: 3 },
      ],
    });
    expect(summary.totalEvents).toBe(2);
    expect(summary.averageMood).toBe(3.5);
  });
});

describe("garden-dormancy", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("goes dormant after the lapse threshold", () => {
    const lastActiveAt = new Date(now.getTime() - (GARDEN_DORMANCY_DAYS + 3) * 86_400_000);
    expect(gardenLifeState({ lastActiveAt, now })).toBe("dormant");
  });
});

describe("lifts-me", () => {
  it("includes explicit marks and regulars", () => {
    const lifts = deriveLiftsMe({
      now: new Date("2026-07-01T12:00:00Z"),
      activities: [
        { id: "a1", title: "Morning walk", liftsMe: true },
        { id: "a2", title: "Tea ritual", liftsMe: false },
      ],
      events: [
        { activityId: "a2", occurredAt: new Date("2026-06-28T10:00:00Z") },
        { activityId: "a2", occurredAt: new Date("2026-06-29T10:00:00Z") },
        { activityId: "a2", occurredAt: new Date("2026-06-30T10:00:00Z") },
      ],
    });
    expect(lifts).toHaveLength(2);
  });
});
