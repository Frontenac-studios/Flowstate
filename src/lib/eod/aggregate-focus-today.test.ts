import { describe, expect, it } from "vitest";

import { aggregateFocusToday } from "./aggregate-focus-today";

const TZ_LA = -480;

describe("aggregateFocusToday", () => {
  it("sums seconds per task for entries started on local day", () => {
    const result = aggregateFocusToday({
      entries: [
        {
          taskId: "t1",
          startedAt: new Date("2026-05-26T20:00:00.000Z"),
          endedAt: new Date("2026-05-26T20:30:00.000Z"),
        },
      ],
      taskTitles: new Map([["t1", "Deep work"]]),
      localDate: "2026-05-26",
      tzOffsetMinutes: TZ_LA,
      now: new Date("2026-05-26T21:00:00.000Z"),
    });

    expect(result.bars).toHaveLength(1);
    expect(result.bars[0]?.seconds).toBe(1800);
    expect(result.bars[0]?.title).toBe("Deep work");
  });

  it("uses now for open entries", () => {
    const now = new Date("2026-05-26T21:10:00.000Z");
    const result = aggregateFocusToday({
      entries: [
        {
          taskId: "t1",
          startedAt: new Date("2026-05-26T21:00:00.000Z"),
          endedAt: null,
        },
      ],
      taskTitles: new Map([["t1", "Active"]]),
      localDate: "2026-05-26",
      tzOffsetMinutes: TZ_LA,
      now,
    });

    expect(result.bars[0]?.seconds).toBe(600);
  });
});
