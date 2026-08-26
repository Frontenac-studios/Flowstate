import { describe, expect, it } from "vitest";

import { computeIdleTrim } from "./idle-trim";

const at = (iso: string) => new Date(iso);

describe("computeIdleTrim", () => {
  it("cuts the entry at the instant idleness began", () => {
    // Started 10:00, now 10:40, away 34m → cut at 10:06, keep the first 6 minutes.
    const trim = computeIdleTrim(at("2026-08-26T10:00:00Z"), at("2026-08-26T10:40:00Z"), 34 * 60);
    expect(trim.closeAt.toISOString()).toBe("2026-08-26T10:06:00.000Z");
    expect(trim.keptSeconds).toBe(6 * 60);
    expect(trim.dropOriginal).toBe(false);
  });

  it("drops the whole entry when it was idle longer than it ran", () => {
    // Started 10:00, now 10:05, away 34m → cut clamps to start, nothing kept.
    const trim = computeIdleTrim(at("2026-08-26T10:00:00Z"), at("2026-08-26T10:05:00Z"), 34 * 60);
    expect(trim.closeAt.toISOString()).toBe("2026-08-26T10:00:00.000Z");
    expect(trim.keptSeconds).toBe(0);
    expect(trim.dropOriginal).toBe(true);
  });

  it("floors fractional away seconds", () => {
    const trim = computeIdleTrim(at("2026-08-26T10:00:00Z"), at("2026-08-26T10:40:00Z"), 600.9);
    expect(trim.closeAt.toISOString()).toBe("2026-08-26T10:30:00.000Z");
    expect(trim.keptSeconds).toBe(30 * 60);
  });

  it("never cuts past now for a zero away window", () => {
    const trim = computeIdleTrim(at("2026-08-26T10:00:00Z"), at("2026-08-26T10:40:00Z"), 0);
    expect(trim.closeAt.toISOString()).toBe("2026-08-26T10:40:00.000Z");
    expect(trim.keptSeconds).toBe(40 * 60);
    expect(trim.dropOriginal).toBe(false);
  });
});
