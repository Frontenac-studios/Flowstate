import { describe, expect, it } from "vitest";

import { buildCareStatsSummary } from "./care-stats";

describe("care-stats", () => {
  it("summarizes frequency and mood gently", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    const summary = buildCareStatsSummary({
      now,
      events: [
        { occurredAt: new Date("2026-06-30T10:00:00Z") },
        { occurredAt: new Date("2026-07-01T09:00:00Z") },
      ],
      reflections: [
        { reflectionDate: "2026-06-30", mood: 4 },
        { reflectionDate: "2026-07-01", mood: 3 },
      ],
      windowDays: 14,
    });

    expect(summary.totalEvents).toBe(2);
    expect(summary.averageMood).toBe(3.5);
    expect(summary.frequencyPhrase).toMatch(/quiet lately/i);
    expect(summary.moodPhrase).toMatch(/mixed/i);
  });

  it("handles empty data without streak language", () => {
    const summary = buildCareStatsSummary({ events: [], reflections: [] });
    expect(summary.totalEvents).toBe(0);
    expect(summary.frequencyPhrase).toMatch(/okay/i);
    expect(summary.moodPhrase).toMatch(/optional/i);
  });
});
