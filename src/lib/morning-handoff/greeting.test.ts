import { describe, expect, it } from "vitest";

import {
  DEFAULT_HANDOFF_FIRST_NAME,
  formatGreetingOpener,
  formatGreetingTitle,
  MORNING_HANDOFF_TIMEZONE,
  resolveGreetingPeriod,
} from "./greeting";

describe("greeting", () => {
  it("resolves morning, afternoon, evening, and late in Pacific time", () => {
    expect(
      resolveGreetingPeriod(new Date("2026-07-16T16:00:00.000Z"), MORNING_HANDOFF_TIMEZONE)
    ).toBe("morning");
    expect(
      resolveGreetingPeriod(new Date("2026-07-16T21:00:00.000Z"), MORNING_HANDOFF_TIMEZONE)
    ).toBe("afternoon");
    expect(
      resolveGreetingPeriod(new Date("2026-07-17T02:00:00.000Z"), MORNING_HANDOFF_TIMEZONE)
    ).toBe("evening");
    expect(
      resolveGreetingPeriod(new Date("2026-07-17T03:30:00.000Z"), MORNING_HANDOFF_TIMEZONE)
    ).toBe("late");
  });

  it("formats personalized titles", () => {
    expect(formatGreetingTitle("morning", "Kat")).toBe("Good morning, Kat");
    expect(formatGreetingTitle("afternoon", "Kat")).toBe("Good afternoon, Kat");
    expect(formatGreetingTitle("evening", "Kat")).toBe("Good evening, Kat");
    expect(formatGreetingTitle("late", "Kat")).toBe("It's late, Kat");
    expect(formatGreetingTitle("morning")).toBe(`Good morning, ${DEFAULT_HANDOFF_FIRST_NAME}`);
  });

  it("formats opener bubbles without a good-night line on late evenings", () => {
    const late = formatGreetingOpener("late", "Kat");
    expect(late).toContain("It's getting late, Kat");
    expect(late.toLowerCase()).toContain("rest");
    expect(late.toLowerCase()).not.toContain("good night");
  });
});
