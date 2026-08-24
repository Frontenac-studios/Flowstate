import { describe, expect, it } from "vitest";

import {
  applyClockToDate,
  formatDuration,
  formatElapsedClock,
  parseClockTime,
  parseDurationToSeconds,
} from "./duration";

describe("parseDurationToSeconds", () => {
  it("treats a decimal as hours", () => {
    expect(parseDurationToSeconds("1.25")).toBe(4500); // 1h15m
    expect(parseDurationToSeconds("0.5")).toBe(1800);
    expect(parseDurationToSeconds("2.0")).toBe(7200);
    expect(parseDurationToSeconds("0.0")).toBeNull();
  });

  it("treats a bare integer as minutes", () => {
    expect(parseDurationToSeconds("90")).toBe(5400);
    expect(parseDurationToSeconds("20")).toBe(1200);
  });

  it("parses h/m unit forms with or without spaces", () => {
    expect(parseDurationToSeconds("20m")).toBe(1200);
    expect(parseDurationToSeconds("1h")).toBe(3600);
    expect(parseDurationToSeconds("1h30m")).toBe(5400);
    expect(parseDurationToSeconds("1h 30m")).toBe(5400);
    expect(parseDurationToSeconds("2H")).toBe(7200);
  });

  it("parses the clock form h:mm", () => {
    expect(parseDurationToSeconds("1:30")).toBe(5400);
    expect(parseDurationToSeconds("0:45")).toBe(2700);
  });

  it("rejects empty, zero, and non-durations", () => {
    expect(parseDurationToSeconds("")).toBeNull();
    expect(parseDurationToSeconds("   ")).toBeNull();
    expect(parseDurationToSeconds("0")).toBeNull();
    expect(parseDurationToSeconds("0m")).toBeNull();
    expect(parseDurationToSeconds("0:00")).toBeNull();
    expect(parseDurationToSeconds("abc")).toBeNull();
    expect(parseDurationToSeconds("1:99")).toBeNull();
  });
});

describe("formatElapsedClock", () => {
  it("shows mm:ss under an hour", () => {
    expect(formatElapsedClock(0)).toBe("00:00");
    expect(formatElapsedClock(5)).toBe("00:05");
    expect(formatElapsedClock(65)).toBe("01:05");
    expect(formatElapsedClock(59 * 60 + 59)).toBe("59:59");
  });

  it("shows h:mm:ss at an hour or more", () => {
    expect(formatElapsedClock(3600)).toBe("1:00:00");
    expect(formatElapsedClock(3600 + 5 * 60 + 9)).toBe("1:05:09");
    expect(formatElapsedClock(10 * 3600 + 2 * 60 + 3)).toBe("10:02:03");
  });

  it("floors fractional seconds and clamps negatives to zero", () => {
    expect(formatElapsedClock(9.9)).toBe("00:09");
    expect(formatElapsedClock(-5)).toBe("00:00");
  });
});

describe("formatDuration", () => {
  it("shows minutes under an hour", () => {
    expect(formatDuration(48 * 60)).toBe("48m");
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(90)).toBe("2m");
  });

  it("zero-pads minutes once hours appear", () => {
    expect(formatDuration(3600)).toBe("1h 00m");
    expect(formatDuration(3600 + 5 * 60)).toBe("1h 05m");
    expect(formatDuration(2 * 3600 + 10 * 60)).toBe("2h 10m");
  });
});

describe("parseClockTime", () => {
  it("parses valid 24h clock strings", () => {
    expect(parseClockTime("08:00")).toEqual({ hours: 8, minutes: 0 });
    expect(parseClockTime("8:05")).toEqual({ hours: 8, minutes: 5 });
    expect(parseClockTime("23:59")).toEqual({ hours: 23, minutes: 59 });
  });

  it("rejects out-of-range and malformed values", () => {
    expect(parseClockTime("24:00")).toBeNull();
    expect(parseClockTime("8")).toBeNull();
    expect(parseClockTime("8:60")).toBeNull();
    expect(parseClockTime("")).toBeNull();
  });
});

describe("applyClockToDate", () => {
  it("sets the local time-of-day without mutating the base", () => {
    const base = new Date(2026, 5, 23, 14, 37, 12, 500);
    const out = applyClockToDate(base, 8, 0);
    expect(out.getHours()).toBe(8);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
    // same calendar day, base untouched
    expect(out.getDate()).toBe(23);
    expect(base.getHours()).toBe(14);
  });
});
