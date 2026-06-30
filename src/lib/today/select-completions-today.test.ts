import { describe, expect, it } from "vitest";

import { selectCompletionsToday } from "./select-completions-today";

// UTC-8 (e.g. America/Los_Angeles standard time).
const TZ = -480;

function row(id: string, completedAt: Date | null) {
  return { id, completedAt };
}

describe("selectCompletionsToday", () => {
  it("keeps only rows completed on the local day", () => {
    const rows = [
      row("today-am", new Date("2026-05-26T16:00:00.000Z")), // 08:00 local
      row("today-pm", new Date("2026-05-27T03:00:00.000Z")), // 19:00 local (same local day)
      row("yesterday", new Date("2026-05-26T07:00:00.000Z")), // 23:00 local on 05-25
      row("tomorrow", new Date("2026-05-27T08:30:00.000Z")), // 00:30 local on 05-27
    ];

    const result = selectCompletionsToday(rows, "2026-05-26", TZ);

    expect(result.map((r) => r.id)).toEqual(["today-pm", "today-am"]);
  });

  it("orders most-recent first", () => {
    const rows = [
      row("first", new Date("2026-05-26T17:00:00.000Z")),
      row("third", new Date("2026-05-26T22:00:00.000Z")),
      row("second", new Date("2026-05-26T20:00:00.000Z")),
    ];

    const result = selectCompletionsToday(rows, "2026-05-26", TZ);

    expect(result.map((r) => r.id)).toEqual(["third", "second", "first"]);
  });

  it("drops rows that were never completed", () => {
    const rows = [row("open", null), row("done", new Date("2026-05-26T18:00:00.000Z"))];

    const result = selectCompletionsToday(rows, "2026-05-26", TZ);

    expect(result.map((r) => r.id)).toEqual(["done"]);
  });

  it("returns an empty list when nothing was completed today", () => {
    const rows = [row("yesterday", new Date("2026-05-25T18:00:00.000Z"))];

    expect(selectCompletionsToday(rows, "2026-05-26", TZ)).toEqual([]);
  });
});
