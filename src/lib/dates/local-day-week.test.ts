import { describe, expect, it } from "vitest";

import {
  datesInIsoWeek,
  isDateInIsoWeek,
  startOfIsoWeekMonday,
  toISODateString,
} from "./local-day";

describe("ISO week date helpers", () => {
  const wed = new Date(2026, 4, 27);

  it("startOfIsoWeekMonday returns Monday 00:00", () => {
    const mon = startOfIsoWeekMonday(wed);
    expect(mon.getDay()).toBe(1);
    expect(toISODateString(mon)).toBe("2026-05-25");
  });

  it("datesInIsoWeek returns 7 days Mon–Sun", () => {
    const dates = datesInIsoWeek(wed).map(toISODateString);
    expect(dates).toEqual([
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
    ]);
  });

  it("isDateInIsoWeek matches current week only", () => {
    expect(isDateInIsoWeek("2026-05-27", wed)).toBe(true);
    expect(isDateInIsoWeek("2026-06-02", wed)).toBe(false);
  });
});
