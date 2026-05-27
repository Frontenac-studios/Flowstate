import { describe, expect, it } from "vitest";

import { localDayUtcBounds } from "./local-day-bounds";

describe("localDayUtcBounds", () => {
  it("returns UTC instants for a browser-local calendar day", () => {
    const { start, end } = localDayUtcBounds("2026-05-26", -480);

    expect(start.toISOString()).toBe("2026-05-26T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-27T08:00:00.000Z");
  });
});
