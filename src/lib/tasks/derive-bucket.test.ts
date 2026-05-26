import { describe, expect, it } from "vitest";

import { deriveBucket } from "./derive-bucket";

describe("deriveBucket", () => {
  const wed = new Date(2026, 4, 27); // Wed May 27 2026

  it("returns later when bucket_override is later", () => {
    expect(deriveBucket({ scheduledDate: null, bucketOverride: "later" }, wed)).toBe("later");
  });

  it("returns today when scheduled_date is null", () => {
    expect(deriveBucket({ scheduledDate: null, bucketOverride: null }, wed)).toBe("today");
  });

  it("returns today for same calendar day", () => {
    expect(deriveBucket({ scheduledDate: "2026-05-27", bucketOverride: null }, wed)).toBe("today");
  });

  it("returns tomorrow for next day", () => {
    expect(deriveBucket({ scheduledDate: "2026-05-28", bucketOverride: null }, wed)).toBe(
      "tomorrow"
    );
  });

  it("returns this_week for day before Sunday in same week", () => {
    expect(deriveBucket({ scheduledDate: "2026-05-30", bucketOverride: null }, wed)).toBe(
      "this_week"
    );
  });

  it("returns later for dates after Sunday of current week", () => {
    expect(deriveBucket({ scheduledDate: "2026-06-02", bucketOverride: null }, wed)).toBe("later");
  });

  it("does not return today for yesterday (past scheduled_date)", () => {
    expect(deriveBucket({ scheduledDate: "2026-05-26", bucketOverride: null }, wed)).toBe("later");
  });

  it("does not return today for dates far in the past", () => {
    expect(deriveBucket({ scheduledDate: "2026-05-01", bucketOverride: null }, wed)).toBe("later");
  });
});
