import { describe, expect, it } from "vitest";

import {
  formatScheduledDateLabel,
  isScheduledDateToken,
  parseISODateToken,
  resolveScheduledDateToken,
  suggestScheduledDateToken,
} from "./scheduled-date-input";

const wed = new Date(2026, 4, 27);

describe("parseISODateToken", () => {
  it("accepts valid calendar dates", () => {
    expect(parseISODateToken("2026-05-30")).toBe("2026-05-30");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseISODateToken("2026-02-30")).toBeNull();
    expect(parseISODateToken("not-a-date")).toBeNull();
    expect(parseISODateToken("2026-5-30")).toBeNull();
  });
});

describe("resolveScheduledDateToken", () => {
  it("resolves ISO dates", () => {
    expect(resolveScheduledDateToken("2026-06-02", wed)).toEqual({
      scheduledDate: "2026-06-02",
      bucketOverride: null,
    });
  });

  it("still resolves keywords", () => {
    expect(resolveScheduledDateToken("fri", wed)?.scheduledDate).toBe("2026-05-29");
  });
});

describe("isScheduledDateToken", () => {
  it("returns true for keywords and ISO dates", () => {
    expect(isScheduledDateToken("today")).toBe(true);
    expect(isScheduledDateToken("2026-05-30")).toBe(true);
    expect(isScheduledDateToken("2026-02-30")).toBe(false);
  });
});

describe("suggestScheduledDateToken", () => {
  it("defaults to today when partial is empty", () => {
    expect(suggestScheduledDateToken("")).toBe("today");
    expect(suggestScheduledDateToken("  ")).toBe("today");
  });

  it("completes tomorrow from partial input", () => {
    expect(suggestScheduledDateToken("Tomorro")).toBe("tomorrow");
    expect(suggestScheduledDateToken("tom")).toBe("tomorrow");
  });

  it("completes today from partial input", () => {
    expect(suggestScheduledDateToken("tod")).toBe("today");
  });

  it("prefers today when to matches multiple keywords", () => {
    expect(suggestScheduledDateToken("to")).toBe("today");
  });

  it("completes weekday abbreviations", () => {
    expect(suggestScheduledDateToken("f")).toBe("fri");
    expect(suggestScheduledDateToken("fri")).toBe("fri");
  });

  it("returns null when no candidate matches", () => {
    expect(suggestScheduledDateToken("xyz")).toBeNull();
    expect(suggestScheduledDateToken("2026-06")).toBeNull();
  });
});

describe("formatScheduledDateLabel", () => {
  it("shows Today for the reference day", () => {
    expect(formatScheduledDateLabel("2026-05-27", { ref: wed })).toBe("Today");
  });

  it("shows weekday abbreviations for dates in the current ISO week", () => {
    expect(formatScheduledDateLabel("2026-05-29", { ref: wed })).toBe("fri");
    expect(formatScheduledDateLabel("2026-05-31", { ref: wed })).toBe("sun");
  });

  it("shows ISO string for dates outside the current ISO week", () => {
    expect(formatScheduledDateLabel("2026-06-02", { ref: wed })).toBe("2026-06-02");
  });

  it("shows Later for bucket override", () => {
    expect(formatScheduledDateLabel(null, { bucketOverride: "later" })).toBe("Later");
  });
});
