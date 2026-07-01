import { describe, expect, it } from "vitest";

import { deriveLiftsMe } from "./lifts-me";

describe("lifts-me", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("includes explicit marks and regulars", () => {
    const lifts = deriveLiftsMe({
      now,
      activities: [
        { id: "a1", title: "Morning walk", liftsMe: true },
        { id: "a2", title: "Tea ritual", liftsMe: false },
      ],
      events: [
        { activityId: "a2", occurredAt: new Date("2026-06-28T10:00:00Z") },
        { activityId: "a2", occurredAt: new Date("2026-06-29T10:00:00Z") },
        { activityId: "a2", occurredAt: new Date("2026-06-30T10:00:00Z") },
      ],
      regularsThreshold: 3,
    });

    expect(lifts).toHaveLength(2);
    expect(lifts.find((item) => item.activityId === "a1")?.reason).toBe("explicit");
    expect(lifts.find((item) => item.activityId === "a2")?.reason).toBe("regular");
  });
});
