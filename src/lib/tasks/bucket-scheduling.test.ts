import { describe, expect, it } from "vitest";

import { deriveBucket } from "./derive-bucket";
import { bucketToSchedulingFields } from "./bucket-scheduling";

describe("bucketToSchedulingFields", () => {
  const wed = new Date(2026, 4, 27); // Wed May 27 2026

  it("round-trips deriveBucket for today", () => {
    expect(deriveBucket(bucketToSchedulingFields("today", wed), wed)).toBe("today");
  });

  it("round-trips deriveBucket for tomorrow", () => {
    expect(deriveBucket(bucketToSchedulingFields("tomorrow", wed), wed)).toBe("tomorrow");
  });

  it("round-trips deriveBucket for this_week (midweek)", () => {
    expect(deriveBucket(bucketToSchedulingFields("this_week", wed), wed)).toBe("this_week");
  });

  it("round-trips deriveBucket for later", () => {
    expect(deriveBucket(bucketToSchedulingFields("later", wed), wed)).toBe("later");
  });

  it("schedules this_week to week end when no distinct day exists", () => {
    const sat = new Date(2026, 4, 30); // Sat May 30 2026
    const fields = bucketToSchedulingFields("this_week", sat);
    expect(fields.bucketOverride).toBeNull();
    expect(fields.scheduledDate).toBe("2026-05-31"); // Sunday
    expect(deriveBucket(fields, sat)).toBe("tomorrow");
  });

  it("round-trips this_week from Saturday when scheduled to week end", () => {
    const sat = new Date(2026, 4, 30);
    const fields = bucketToSchedulingFields("this_week", sat);
    expect(deriveBucket(fields, sat)).toBe("tomorrow");
    expect(fields.scheduledDate).toBe("2026-05-31");
  });
});
