import { describe, expect, it } from "vitest";

import { isWeekWindDownDue } from "./week-wind-down";

describe("isWeekWindDownDue", () => {
  it("is due on the configured day at or after the hour", () => {
    const sunday6pm = new Date(2026, 5, 28, 18, 0, 0);
    expect(isWeekWindDownDue(sunday6pm, { day: 0, hour: 18 })).toBe(true);
    expect(isWeekWindDownDue(new Date(2026, 5, 28, 17, 59, 0), { day: 0, hour: 18 })).toBe(false);
    expect(isWeekWindDownDue(new Date(2026, 5, 27, 18, 0, 0), { day: 0, hour: 18 })).toBe(false);
  });
});
