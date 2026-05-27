import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateTop3Stall, type Top3TaskInput } from "./evaluate-top3-stall";

/** US Pacific: client sends `-new Date().getTimezoneOffset()` (480 in PDT → -480). */
const TZ_LA = -480;

function task(
  overrides: Partial<Top3TaskInput> & Pick<Top3TaskInput, "id" | "title">
): Top3TaskInput {
  return {
    top3Order: 1,
    top3PinnedAt: null,
    scheduledDate: "2026-05-26",
    completedAt: null,
    ...overrides,
  };
}

describe("evaluateTop3Stall", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not fire before threshold hour", () => {
    const now = new Date("2026-05-26T18:00:00.000Z"); // 10am Pacific with TZ_LA
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [task({ id: "a", title: "A", top3Order: 1 })],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.shouldFireStallNudge).toBe(false);
    expect(result.stalledTasks).toHaveLength(1);
  });

  it("fires after 2pm when stalled and not yet nudged", () => {
    const now = new Date("2026-05-26T23:00:00.000Z"); // 3pm Pacific
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [task({ id: "a", title: "A", top3Order: 1 })],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.shouldFireStallNudge).toBe(true);
  });

  it("does not fire when focus session exists today", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [task({ id: "a", title: "A", top3Order: 1 })],
      timeEntriesToday: [{ taskId: "a", startedAt: new Date("2026-05-26T20:00:00.000Z") }],
      alreadyNudgedToday: false,
    });
    expect(result.stalledTasks).toHaveLength(0);
    expect(result.shouldFireStallNudge).toBe(false);
  });

  it("dedupes when already nudged today", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [task({ id: "a", title: "A", top3Order: 1 })],
      timeEntriesToday: [],
      alreadyNudgedToday: true,
    });
    expect(result.shouldFireStallNudge).toBe(false);
  });

  it("ignores completed Top 3 for stall", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [
        task({
          id: "a",
          title: "A",
          top3Order: 1,
          completedAt: new Date("2026-05-26T12:00:00.000Z"),
        }),
      ],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.stalledTasks).toHaveLength(0);
    expect(result.shouldFireStallNudge).toBe(false);
  });

  it("flags slipped tasks at 2+ calendar days", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [
        task({
          id: "a",
          title: "Old pin",
          top3Order: 2,
          top3PinnedAt: new Date("2026-05-24T12:00:00.000Z"),
        }),
      ],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.slippedTasks).toHaveLength(1);
    expect(result.slippedTasks[0]?.daysSlipped).toBeGreaterThanOrEqual(2);
  });

  it("respects NUDGE_DEBUG_HOUR", () => {
    vi.stubEnv("NUDGE_DEBUG_HOUR", "10");
    const now = new Date("2026-05-26T18:00:00.000Z"); // 10am Pacific
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [task({ id: "a", title: "A", top3Order: 1 })],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.shouldFireStallNudge).toBe(true);
  });

  it("stalls only Top 3 tasks without focus today when others were focused", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [
        task({ id: "a", title: "Focused", top3Order: 1 }),
        task({ id: "b", title: "Stalled", top3Order: 2 }),
      ],
      timeEntriesToday: [{ taskId: "a", startedAt: new Date("2026-05-26T20:00:00.000Z") }],
      alreadyNudgedToday: false,
    });
    expect(result.stalledTasks).toEqual([{ id: "b", title: "Stalled", top3Order: 2 }]);
    expect(result.shouldFireStallNudge).toBe(true);
  });

  it("does not fire when no incomplete Top 3 remain", () => {
    const now = new Date("2026-05-26T23:00:00.000Z");
    const result = evaluateTop3Stall({
      now,
      tzOffsetMinutes: TZ_LA,
      localDate: "2026-05-26",
      top3Tasks: [
        task({
          id: "a",
          title: "Done 1",
          top3Order: 1,
          completedAt: new Date("2026-05-26T12:00:00.000Z"),
        }),
        task({
          id: "b",
          title: "Done 2",
          top3Order: 2,
          completedAt: new Date("2026-05-26T13:00:00.000Z"),
        }),
      ],
      timeEntriesToday: [],
      alreadyNudgedToday: false,
    });
    expect(result.stalledTasks).toHaveLength(0);
    expect(result.shouldFireStallNudge).toBe(false);
  });
});
