import { describe, expect, it } from "vitest";

import { groupCompletionsByLocalDay } from "./group-completions-by-day";

// UTC-8 (e.g. America/Los_Angeles standard time).
const TZ = -480;

function row(id: string, completedAt: Date | null) {
  return { id, completedAt };
}

describe("groupCompletionsByLocalDay", () => {
  it("buckets rows by their browser-local completion day", () => {
    const rows = [
      row("mon-am", new Date("2026-05-25T16:00:00.000Z")), // 08:00 local 05-25
      row("mon-pm", new Date("2026-05-26T03:00:00.000Z")), // 19:00 local 05-25
      row("tue", new Date("2026-05-27T03:00:00.000Z")), // 19:00 local 05-26
    ];

    const grouped = groupCompletionsByLocalDay(rows, TZ);

    expect(Array.from(grouped.keys()).sort()).toEqual(["2026-05-25", "2026-05-26"]);
    expect(grouped.get("2026-05-25")?.map((r) => r.id)).toEqual(["mon-pm", "mon-am"]);
    expect(grouped.get("2026-05-26")?.map((r) => r.id)).toEqual(["tue"]);
  });

  it("orders each day's bucket most-recent first", () => {
    const rows = [
      row("first", new Date("2026-05-26T17:00:00.000Z")),
      row("third", new Date("2026-05-26T22:00:00.000Z")),
      row("second", new Date("2026-05-26T20:00:00.000Z")),
    ];

    const grouped = groupCompletionsByLocalDay(rows, TZ);

    expect(grouped.get("2026-05-26")?.map((r) => r.id)).toEqual(["third", "second", "first"]);
  });

  it("drops rows that were never completed", () => {
    const rows = [row("open", null), row("done", new Date("2026-05-26T18:00:00.000Z"))];

    const grouped = groupCompletionsByLocalDay(rows, TZ);

    expect(grouped.get("2026-05-26")?.map((r) => r.id)).toEqual(["done"]);
    expect(Array.from(grouped.keys())).toEqual(["2026-05-26"]);
  });

  it("returns an empty map when nothing was completed", () => {
    expect(groupCompletionsByLocalDay([row("open", null)], TZ).size).toBe(0);
  });
});
