import { describe, expect, it } from "vitest";

import {
  LEDGER_EPOCH_FRIDAY,
  formatPeriodLabel,
  isPeriodClosed,
  lastClosedPeriod,
  periodContaining,
  periodForKey,
  shiftPeriod,
} from "./fortnight";

/** UTC noon avoids any ambiguity about which local day an instant falls in. */
const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const UTC = 0;
const DAY_MS = 86_400_000;
const dayOfWeek = (iso: string) => new Date(`${iso}T00:00:00.000Z`).getUTCDay();

const FRIDAY = 5;
const THURSDAY = 4;

describe("fortnight period arithmetic", () => {
  it("anchors on a Friday", () => {
    expect(dayOfWeek(LEDGER_EPOCH_FRIDAY)).toBe(FRIDAY);
  });

  it("runs Friday to Thursday and closes on a Friday", () => {
    const period = periodContaining(at("2026-09-02"), UTC);
    expect(dayOfWeek(period.startDate)).toBe(FRIDAY);
    expect(dayOfWeek(period.endDate)).toBe(THURSDAY);
    expect(dayOfWeek(period.closesOn)).toBe(FRIDAY);
  });

  it("spans exactly fourteen days", () => {
    const period = periodContaining(at("2026-09-02"), UTC);
    expect(period.end.getTime() - period.start.getTime()).toBe(14 * DAY_MS);
  });

  it("partitions the timeline with no gap and no overlap", () => {
    // A full year of periods, each starting exactly where the last one ended.
    let period = periodContaining(at("2026-01-15"), UTC);
    for (let i = 0; i < 26; i += 1) {
      const next = shiftPeriod(period, 1, UTC);
      expect(next.start.getTime()).toBe(period.end.getTime());
      expect(next.index).toBe(period.index + 1);
      period = next;
    }
  });

  it("opens on the fortnight that closed that morning, on a review Friday", () => {
    // The whole point of the Fri→Thu window: read on Friday, nothing is stale and
    // no partial day sits in the denominator.
    const closed = lastClosedPeriod(at("2026-09-11"), UTC);
    expect(closed.startDate).toBe("2026-08-28");
    expect(closed.endDate).toBe("2026-09-10");
    expect(closed.closesOn).toBe("2026-09-11");
  });

  it("mid-fortnight, the last closed period is the previous one", () => {
    const closed = lastClosedPeriod(at("2026-09-02"), UTC);
    expect(closed.startDate).toBe("2026-08-14");
    expect(closed.endDate).toBe("2026-08-27");
  });

  it("treats the closing Thursday as still in progress", () => {
    const current = periodContaining(at("2026-09-10"), UTC);
    expect(current.startDate).toBe("2026-08-28");
    expect(isPeriodClosed(current, at("2026-09-10"))).toBe(false);
    expect(isPeriodClosed(current, new Date("2026-09-11T00:00:00.000Z"))).toBe(true);
  });

  it("defines periods before the epoch (negative index)", () => {
    const period = periodContaining(at("2025-12-31"), UTC);
    expect(period.index).toBe(-1);
    expect(period.startDate).toBe("2025-12-19");
    expect(period.endDate).toBe("2026-01-01");
  });

  it("resolves a key back to the same period, and rejects unaligned keys", () => {
    const period = periodContaining(at("2026-09-02"), UTC);
    expect(periodForKey(period.key, UTC)).toEqual(period);
    // A Friday, but not one the fortnight cycle lands on.
    expect(periodForKey("2026-09-04", UTC)).toBeNull();
    expect(periodForKey("not-a-date", UTC)).toBeNull();
  });

  it("honours the timezone offset when placing the boundary instants", () => {
    const utc = periodContaining(at("2026-09-02"), 0);
    const nzst = periodContaining(at("2026-09-02"), 780);
    expect(nzst.startDate).toBe(utc.startDate);
    // Local midnight in UTC+13 is 13h earlier in absolute time.
    expect(utc.start.getTime() - nzst.start.getTime()).toBe(780 * 60_000);
  });

  it("keeps calendar day maths exact across a DST boundary", () => {
    // This period spans the 29 Mar European DST change: still 14 whole calendar
    // days, because the day maths never touches the offset.
    const period = periodForKey("2026-03-27", UTC)!;
    expect(period.endDate).toBe("2026-04-09");
    expect(period.end.getTime() - period.start.getTime()).toBe(14 * DAY_MS);
  });

  it("labels a period, collapsing the month when it does not change", () => {
    expect(formatPeriodLabel(periodForKey("2026-08-14", UTC)!)).toBe("14–27 Aug 2026");
    expect(formatPeriodLabel(periodForKey("2026-08-28", UTC)!)).toBe("28 Aug – 10 Sep 2026");
  });
});
