import { describe, expect, it } from "vitest";

import { isWinDateWritable } from "./grace-window";

const TZ_LA = -420;

describe("isWinDateWritable", () => {
  it("allows today at any hour", () => {
    const now = new Date("2026-07-01T22:00:00.000Z");
    expect(isWinDateWritable("2026-07-01", now, TZ_LA)).toBe(true);
  });

  it("allows yesterday before local noon", () => {
    const now = new Date("2026-07-01T18:59:00.000Z");
    expect(isWinDateWritable("2026-06-30", now, TZ_LA)).toBe(true);
  });

  it("blocks yesterday after local noon", () => {
    const now = new Date("2026-07-01T19:00:00.000Z");
    expect(isWinDateWritable("2026-06-30", now, TZ_LA)).toBe(false);
  });

  it("blocks dates older than yesterday", () => {
    const now = new Date("2026-07-01T15:00:00.000Z");
    expect(isWinDateWritable("2026-06-28", now, TZ_LA)).toBe(false);
  });

  it("blocks future dates after local midnight rollover", () => {
    const now = new Date("2026-07-01T08:00:00.000Z");
    expect(isWinDateWritable("2026-07-02", now, TZ_LA)).toBe(false);
  });

  it("allows yesterday at local hour 11:59", () => {
    const now = new Date("2026-07-01T18:59:59.000Z");
    expect(isWinDateWritable("2026-06-30", now, TZ_LA)).toBe(true);
  });

  it("blocks yesterday at local noon exactly", () => {
    const now = new Date("2026-07-01T19:00:00.000Z");
    expect(isWinDateWritable("2026-06-30", now, TZ_LA)).toBe(false);
  });

  it("blocks day-before-yesterday even before local noon", () => {
    const now = new Date("2026-07-01T10:00:00.000Z");
    expect(isWinDateWritable("2026-06-29", now, TZ_LA)).toBe(false);
  });

  it("respects grace window in positive-offset timezones", () => {
    const tzTokyo = 540;
    const beforeNoon = new Date("2026-07-01T02:59:00.000Z");
    const atNoon = new Date("2026-07-01T03:00:00.000Z");

    expect(isWinDateWritable("2026-06-30", beforeNoon, tzTokyo)).toBe(true);
    expect(isWinDateWritable("2026-06-30", atNoon, tzTokyo)).toBe(false);
  });
});
