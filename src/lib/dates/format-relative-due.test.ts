import { describe, expect, it } from "vitest";

import { formatRelativeDue } from "./format-relative-due";

const today = new Date(2026, 5, 22); // Mon Jun 22 2026

describe("formatRelativeDue", () => {
  it("returns null when there is no date", () => {
    expect(formatRelativeDue(null, today)).toBeNull();
    expect(formatRelativeDue(undefined, today)).toBeNull();
  });

  it("labels today as a warning", () => {
    expect(formatRelativeDue("2026-06-22", today)).toEqual({
      text: "today",
      emphasis: "warning",
      days: 0,
    });
  });

  it("labels future dates as muted", () => {
    expect(formatRelativeDue("2026-06-25", today)).toEqual({
      text: "in 3d",
      emphasis: "muted",
      days: 3,
    });
    expect(formatRelativeDue("2026-06-23", today)).toMatchObject({ text: "in 1d" });
  });

  it("labels past dates as overdue danger", () => {
    expect(formatRelativeDue("2026-06-20", today)).toEqual({
      text: "overdue 2d",
      emphasis: "danger",
      days: -2,
    });
  });
});
