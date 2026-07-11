import { describe, expect, it } from "vitest";

import { focusThreadId, goalsCoachThreadId, parseGoalsCoachYear, threadIdSchema } from "./threads";

describe("goals coach threads", () => {
  it("round-trips a card year", () => {
    expect(goalsCoachThreadId(2026)).toBe("goals:2026");
    expect(parseGoalsCoachYear("goals:2026")).toBe(2026);
  });

  it("rejects non-goals thread ids", () => {
    expect(parseGoalsCoachYear("global")).toBeNull();
    expect(parseGoalsCoachYear(focusThreadId("00000000-0000-4000-8000-000000000001"))).toBeNull();
    expect(parseGoalsCoachYear("goals:abc")).toBeNull();
  });

  it("threadIdSchema accepts global, focus, and goals threads", () => {
    expect(threadIdSchema.safeParse("global").success).toBe(true);
    expect(
      threadIdSchema.safeParse(focusThreadId("00000000-0000-4000-8000-000000000001")).success
    ).toBe(true);
    expect(threadIdSchema.safeParse("goals:2026").success).toBe(true);
    expect(threadIdSchema.safeParse("goals:99").success).toBe(false);
    expect(threadIdSchema.safeParse("nonsense").success).toBe(false);
  });
});
